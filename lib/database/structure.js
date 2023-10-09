const { database: db } = require("./index.js");

exports.structure = (conn, m) => {
	try {
		// default structure
		// please edit/add before run.
		// otherwise it will not optimize
		const structure = {
			user: {
				name: m.pushName ? m.pushName : m.name,
				premium: false,
				premiumTime: -0,
				limit: {
					value: 10,
					price: 5000
				},
				afk: false,
				afkReason: "",
				banned: false,
				health: 100,
				money: 100,
				rpg: false,
				miaw: false,
				// TODO: Akinator.
				akinator: {
					active: false,
					base: 0,
					channel: 0,
					session: 0,
					signature: 0,
					step: 0,
					answer: 0,
					progress: 0,
					infogain: 0,
					questionId: 0,
					response_challenge: "string",
				},

				// datas rpgs
				rpg_data: {
					// user activity
					isMining: false,
					isHunting: false,
					isFishing: false,
					potion: {
						value: 10,
						price: 4000,
					},
					// user props
					hunting: {
						gajah: {
							value: 0,
							price: 10000
						},
						monyet: {
							value: 0,
							price: 4000
						},
						ikan: {
							value: 0,
							price: 1000
						},
						sapi: {
							value: 0,
							price: 6000
						},
						semut: {
							value: 0,
							price: 500
						},
						ayam: {
							value: 0,
							price: 2000
						},
						keledai: {
							value: 0,
							price: 4000
						},
					},

					fishing: {
						salmon: {
							value: 0,
							price: 1000
						},
						sampah: {
							value: 0,
							price: 100
						},
						koi: {
							value: 0,
							price: 500
						},
					},
					mining: {
						batu: {
							value: 0,
							price: 100
						},
						ganja: {
							value: 0,
							price: 100000
						},

						emerald: {
							value: 0,
							price: 100000
						},
						emas: {
							value: 0,
							price: 100000
						},
						tembaga: {
							value: 0,
							price: 10000
						},
					},
				}
			},
			chat: {
				welcome: false,
				isBanned: false,
				antiLink: false,
				simi: {
					enable: false,
					level: 1,
				},
				sewa: false,
				sewaTime: -0,
				sWelcome: "",
				sLeft: "",
				sDone: "",
				sProses: "",
				listResponse: {},
				miaw: false
			},
			settings: {
				maintenance: false,
				self: false,
				autoread: false,
				rpg: {
					enable: true
				},
				openai: true
			},
		};
		let user = db.data.users[m.sender];
		if (typeof user !== "object") {
			db.data.users[m.sender] = {};
		}
		if (user) {
			Object.keys(user).forEach(([key, value]) => {
				if (
					key in structure.user &&
					typeof user[key] === typeof structure.user[key]
				) {
					Object.assign(user, {
						[key]: value,
					});
				}
			});
		} else {
			db.data.users[m.sender] = { ...structure.user };
		}
		if (m.isGroup) {
			let chat = db.data.chats[m.chat];
			if (typeof chat !== "object") {
				db.data.chats[m.chat] = {};
			}
			if (chat) {
				Object.keys(chat).forEach(([key, value]) => {
					if (
						key in structure.chat &&
						typeof chat[key] === typeof structure.chat[key]
					) {
						Object.assign(chat, {
							[key]: value,
						});
					}
				});
			} else {
				db.data.chats[m.chat] = { ...structure.chat };
			}
		}

		let settings = db.data.settings[conn.user.jid];
		if (typeof settings !== "object") {
			db.data.settings[conn.user.jid] = {};
		}
		if (settings) {
			Object.keys(settings).forEach(([key, value]) => {
				if (
					key in structure.settings &&
					typeof settings[key] === typeof structure.settings[key]
				) {
					Object.assign(settings, {
						[key]: value,
					});
				}
			});
		} else {
			db.data.settings[conn.user.jid] = { ...structure.settings };
		}
		return structure
	} catch (e) {
		console.error(e);
	}
};
