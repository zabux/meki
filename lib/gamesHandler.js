const chalk = require("chalk");
const fs = require("fs");
const { database: db } = require("./database.js");

async function gamesHandler(conn, m) {
	if (!m.text || m.fromMe) {
		return
	}
	// tebakan
	if (conn.tebaklirik && conn.tebaklirik[m.chat]) {
		const tebaklirik = JSON.parse(JSON.stringify(conn.tebaklirik[m.chat][1]));
		if (m.text && m.text.toLowerCase() === tebaklirik.jawaban.toLowerCase().trim()) {
			db.data.users[m.sender].money += conn.tebaklirik[m.chat][2]
			await conn.sendMessage(m.chat, {
				text: `Jawaban benar
Reward: Rp. *${Number(conn.tebaklirik[m.chat][2]).toLocaleString("id")}*`
			}, { quoted: m })
			clearTimeout(conn.tebaklirik[m.chat][3]);
			delete conn.tebaklirik[m.chat];
		}
	}
	if (conn.tebakan && conn.tebakan[m.chat]) {
		const tebakan = JSON.parse(JSON.stringify(conn.tebakan[m.chat][1]));
		if (m.text && m.text.toLowerCase() === tebakan.jawaban.toLowerCase().trim()) {
			db.data.users[m.sender].money += conn.tebakan[m.chat][2]
			await conn.sendMessage(m.chat, {
				text: `Jawaban benar
Reward: Rp. *${Number(conn.tebakan[m.chat][2]).toLocaleString("id")}*`
			}, { quoted: m })
			clearTimeout(conn.tebakan[m.chat][3]);
			delete conn.tebakan[m.chat];
		}
	}
	if (conn.tebakkata && conn.tebakkata[m.chat]) {
		const tebakkata = JSON.parse(JSON.stringify(conn.tebakkata[m.chat][1]));
		if (m.text && m.text.toLowerCase() === tebakkata.jawaban.toLowerCase().trim()) {
			db.data.users[m.sender].money += conn.tebakkata[m.chat][2]
			await conn.sendMessage(m.chat, {
				text: `Jawaban benar
Reward: Rp. *${Number(conn.tebakkata[m.chat][2]).toLocaleString("id")}*`
			}, { quoted: m })
			clearTimeout(conn.tebakkata[m.chat][3]);
			delete conn.tebakkata[m.chat];
		}
	}
	if (conn.asahotak && conn.asahotak[m.chat]) {
		const asahotak = JSON.parse(JSON.stringify(conn.asahotak[m.chat][1]));
		if (m.text && m.text.toLowerCase() === asahotak.jawaban.toLowerCase().trim()) {
			db.data.users[m.sender].money += conn.asahotak[m.chat][2]
			await conn.sendMessage(m.chat, {
				text: `Jawaban benar
Reward: Rp. *${Number(conn.asahotak[m.chat][2]).toLocaleString("id")}*`
			}, { quoted: m })
			clearTimeout(conn.asahotak[m.chat][3]);
			delete conn.asahotak[m.chat];
		}
	}
}
module.exports = {
	gamesHandler
}

let file = require.resolve(__filename);
fs.watchFile(file, () => {
	fs.unwatchFile(file);
	console.log(chalk.green("[UPDATED]", chalk.white(__filename)));
	delete require.cache[file];
	require(file);
});
