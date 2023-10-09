import fs from "fs";
import { execSync } from "child_process";
import fetch from "node-fetch";

const followDate = new Date()

export async function before(m) {
	let chat = db.data.chats[m.chat] || {};
	if (!chat.autobackup) chat.autobackup = [];
	if (chat && chat.backup) {
		setTimeout(async () => {
			conn.logger.info(`Backup Bot`);
			const f = {
				key: {
					remoteJid: "status@broadcast",
					participant: "0@s.whatsapp.net",
				},
				message: {
					documentMessage: {
						title: "B A C K U P - B O T",
						jpegThumbnail: await (
							await fetch(`https://i.ibb.co/M5zdTWt/20221025-115823.jpg`)
						).buffer(),
					},
				},
			};
			const date = (new Date()).toLocaleDateString("id", {
				day: "numeric",
				month: "long",
				year: "numeric",
			});
			await m.reply("tunggu");
			await conn.sendMessage(m.chat, {
				react: {
					text: "✅",
					key: m.key,
				},
			});
			await m.reply("Data Bot Succes Di Backup");
			await conn.reply(
				nomorown + "@s.whatsapp.net",
				`*🗓️ Backup Bot:* ${date}`,
				null
			);
			const ls = (await execSync("ls"))
				.toString()
				.split("\n")
				.filter(
					(pe) =>
						pe != "node_modules" &&
						pe != "package-lock.json" &&
						pe != "baileys_store.json" &&
						pe != "test.js" &&
						pe != "kanaeru.json" &&
						pe != "jadibot" &&
						pe != "Dockerfile" &&
						pe != "tmp" &&
						pe != "temp" &&
						pe != ""
				);
			const exec = await execSync(`zip -r backup_bot.zip ${ls.join(" ")}`);
			await conn.sendMessage(
				nomorown + "@s.whatsapp.net",
				{
					document: await fs.readFileSync("./backup_bot.zip"),
					mimetype: "application/zip",
					fileName: "backup_bot.zip",
				},
				{ quoted: f }
			);
			await execSync("rm -rf backup_bot.zip");
		}, followDate.getMinutes() % 10 * 60 * 1000 + 10 * 60 * 1000);
	}
}
