const chalk = require("chalk");
const fs = require("fs");

module.exports = {
	owner: ["628565337357", "628385818401", "6283840738953","6283849947001"],
	ownerName: "Awy_",
	botName: "Miaw",
	footer: "© MIAWTEAM | 2022",
	sessionName: "session",
	pathimg: "./media/logo.jpg",
	qris: "./media/qris.jpg",
	caption_pay: `*All payments*

*E-walet Monay :*
➭ Dana : 0856-5337-357
➭ Ovo : 0856-5337-357
➭ Gopay : 0956-5337-357
➭ Pulsa : 08575-1337-466
`,
	group: "https://chat.whatsapp.com/IYa9dkJTtltDRPdXC8JaQt",
	yootube: "https://youtube.com/channel/UCLd-bhT8Dqq9PjGc6bWUVyg",
	igCookie:
		"csrftoken=Yj80cFn0zMn6svtMdvKTBcMzMwWPsQzx; sessionid=53767158422%3A4hXJOZ2NBfcF2f%3A10; ds_user_id=53767158422;",
	fake: "Created By Awy_",
	limitCount: 20,
	limitGame: 15,
	gamewaktu: 50,
	sticker: {
		packname: "© Miaw",
		author: "@Alwiiyy__",
	},
	ampangPedia: {
		userid: "iCnA38Ye",
		apikey: "XEjxfPqDK7SabAzTouCRu5SIdjnKILawVmLeU8kBwB6SOA45GNDtvI7M5jvwuIf6",
	},
	api: {
		rose: "https://api.itsrose.life",
		apikey: "40145eb78be64cfb9757e61f",
	},
	rpg: {
		defaultTime: 25,
	},
	mess: {
		maintenance: "Bot sedang maintenance / sedang dalam perbaikan ⛔",
		owner: "Perintah hanya untuk owner!",
		admin: "Perintah khusus admin group",
		botAdmin: "jadikan bot admin untuk menggunakan perintah ini",
		premium: "Perintah khusus pengguna premium, silahkan ketik .belipremium",
		group: "Perintah ini dapat digunakan di group",
		wait: "Please wait..",
		limit: "wah limit kamu habis, sialankan chat owner untuk diskusi lebih kanjut.",
		limitUsed: "Satu limit terpakai",

		rpgDisabled: "Fitur rpg di nonaktifkan oleh owner",

		// rpg messing.
		notEnoughHealth: "Darah kamu kurang kak\nDarah : .health",
		alreadyInRpg: "Lu udah join kak",
		notInRpg: "join rpg dulu kak\nketik .joinrpg",

		// activity messing.
		isMining: "Lu masih mining gabisa pake command dek",
		startMining: "@user mulai mining.",

		isHunting: "Lu masih berburu gabisa pake command dek",
		startHunting: "@user mulai berburu.",

		isFishing: "Lu masih mancing gabisa pake command dek",
		startFishing: "@user mulai memancing.",
	}
};
let file = require.resolve(__filename);
fs.watchFile(file, () => {
	fs.unwatchFile(file);
	console.log(chalk.green("[UPDATED]", chalk.white(__filename)));
	delete require.cache[file];
	require(file);
});
