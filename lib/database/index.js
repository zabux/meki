/** from wabot-aq/games-wabot. Multi-Device */
// use json file instead cloudDBAdapter
const { join } = require("path")
const chalk = require("chalk");
const { Low, JSONFile } = require("./DB_Adapters/lowdb/index.js");

const lodash = require("lodash");

let database = new Low(new JSONFile("database.json"));

loadDatabase();

async function loadDatabase() {
	// If database is processed to be loaded from cloud, wait for it to be done
	if (database._read) await database._read;
	if (database.data !== null) return database.data;
	database._read = database.read().catch(console.error);
	await database._read;
	console.log(chalk.green("- Database loaded -"));
	database.data = {
		users: {},
		chats: {},
		stats: {},
		msgs: {},
		sticker: {},
		settings: {},
		...(database.data || {}),
	};
	database.chain = lodash.chain(database.data);

	return database.data;
}

module.exports = { database, loadDatabase };
