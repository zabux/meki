const fs = require("fs");
const chalk = require("chalk");

const { database: db } = require("./database");

module.exports = async (conn, data) => {
	const jid = data.id;
	const metadata = await conn.groupMetadata(jid);
	try {
		for (let i of data.participants) {
			if (db.data.chats[jid] && db.data.chats[jid].welcome) {
				const ppuser = await conn
					.profilePictureUrl(i, "image")
					.catch(() => "https://telegra.ph/file/e49209a4ab67cbb1cf4e5.jpg");
				const message = (
					data.action === "add"
						? db.data.chats[jid].sWelcome ||
						  "Welcome to @subject @user\n\n@desc"
						: data.action === "remove"
						? db.data.chats[jid].sLeft || "Titip salam sama janda pirang @user"
						: ""
				)
					.replace(/user/, i.replace(/[^0-9]/g, ""))
					.replace(/@subject/, metadata.subject)
					.replace(/@desc/, metadata.desc);

				conn.sendMessage(data.id, {
					caption: `${message}`,
					image: {
						url: ppuser,
					},
					mentions: [i],
					buttons: [
						{
							buttonId: ".chatgpt ucapkan selamat datang kepada member baru group whatsapp",
							buttonText: { displayText: "Halo kak Selamat Datang" },
							type: 1,
						}
					]
				});
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
