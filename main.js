const { Boom } = require("@hapi/boom");
const {
	default: makeWASocket,
	BufferJSON,
	initInMemoryKeyStore,
	DisconnectReason,
	AnyMessageContent,
	useMultiFileAuthState,
	makeInMemoryStore,
	delay,
	downloadContentFromMessage,
	jidDecode,
	generateForwardMessageContent,
	generateWAMessageFromContent,
	proto,
	prepareWAMessageMedia,
	jidNormalizedUser
} = require("@whiskeysockets/baileys");
const Pino = require("pino");

const { database: db } = require("./lib/database");

const store = makeInMemoryStore({
	logger: Pino().child({ level: 'silent', stream: 'store' }),
});
store?.readFromFile(`data.store.json`);

setInterval(() => {
	store?.writeToFile(`data.store.json`);
}, 10_000);

const connect = async () => {
	const { state, saveCreds } = await useMultiFileAuthState("./session");
	const sock = makeWASocket({
		printQRInTerminal: true,
		logger: Pino({ level: "silent" }),
		auth: state,
		browser: ["Miawbot Multi Device", "Chrome", "4.0"],
		patchMessageBeforeSending: (message) => {
			const requiresPatch = !!(
				message.buttonsMessage ||
				message.templateMessage ||
				message.listMessage
			);
			if (requiresPatch) {
				message = {
					viewOnceMessage: {
						message: {
							messageContextInfo: {
								deviceListMetadataVersion: 2,
								deviceListMetadata: {},
							},
							...message,
						},
					},
				};
			}
			return message;
		},
	});
	sock.ev.on("creds.update", async () => await saveCreds());
	store.bind(sock.ev);

	sock.ev.on("messages.upsert", async (msg) => {
		require("./Meki")(
			sock,
			msg,
			store
		);
	});

	//  To Read Presences
	sock.ev.on("presence.update", async (data) => {
		// Read Data Presences Afk
		if (data.presences) {
			for (let key in data.presences) {
				if (
					data.presences[key].lastKnownPresence === "composing" ||
					data.presences[key].lastKnownPresence === "recording"
				) {
					if (db.data.users[key] && db.data.users[key].afk) {
						db.data.users[key].afk = false
						db.data.users[key].afkReason = ""
						sock.sendMessage(data.id, {
							text: `@${key.replace(/[^0-9]/g, "")} berhenti afk, dia sedang ${
								data.presences[key].lastKnownPresence === "composing"
									? "mengetik"
									: "merekam"
							}`,
							mentions: [key],
						});
					}
				}
			}
		}
	});

	sock.ev.on("connection.update", (update) => {
		const { connection, lastDisconnect } = update;
		const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
		if (connection == "close") {
			if (reason !== DisconnectReason.loggedOut) {
				connect();
			} else {
				console.log("Connection closed. You are logged out");
				process.exit();
			}
		}
		if (connection == "open") {
			console.log({ connection });
		}
	});

	sock.ev.on("group-participants.update", async (data) => {
		require("./lib/groupHandler")(sock, data)
	});
/*
	sock.ev.on("messages.delete", (item) => {
		if ("all" in item) {
			const list = messages[item.jid];
			list === null || list === void 0 ? void 0 : list.clear();
		} else {
			const jid = item.keys[0].remoteJid;
			const list = messages[jid];
			if (list) {
				const idSet = new Set(item.keys.map((k) => k.id));
				list.filter((m) => !idSet.has(m.key.id));
			}
		}
	});
*/

	sock.ev.on("chats.delete", (deletions) => {
		for (const item of deletions) {
			chats.deleteById(item);
		}
	});
	sock.ev.on("contacts.update", (update) => {
		for (let contact of update) {
			let id = jidNormalizedUser(contact.id);
			if (store && store.contacts)
				store.contacts[id] = { id, name: contact.notify };
		}
	});
	sock.ev.on("call", (events) => {
		const call = events[0]
		if (call.status === "offer") {
			sock.rejectCall(call.id, call.from)
		}
	})

	if (sock.user && sock.user?.id) {
		sock.user.jid = jidNormalizedUser(sock.user?.id);
	}
	return sock;
};

connect();
