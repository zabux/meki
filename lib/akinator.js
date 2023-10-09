const axios = require("axios");
const https = require("https")
const parser = require("xml2json");
const { v4 } = require("uuid");

const Axios = axios.create({
	httpsAgent: new https.Agent({ keepAlive: true })
})
const BASE_URL = {
	srv: {
		base: "https://srv14.akinator.com:9442",
		path: {
			session: "/ws/new_session.php",
			answer: "/ws/answer.php"
		},
		params: {
			init: {
				base: 0,
				partner: 410,
				premium: 1,
				player: "Android-Phone",
				uid: v4(),
				do_geoloc: 1,
				vd: 0,
				prio: 0,
				constraint: "ETAT<>'AV'",
				channel: 0,
				origin: "GB"
			},
			run: {
				base: 0,
				channel: 0,
				session: 0,
				signature: undefined,
				response_challenge: undefined,

			}
		},
		["user-agent"]: "Dalvik/2.1.0 (Linux; U; Android 12; SM-G9880 Build/SKQ1.211019)"
	}
}

function lowerCase(opts) {
	for (let key in opts) {
		const low = key.toLowerCase();
		opts[low] = opts[key];
		delete opts[key]
	}
	return opts
}
async function initEvent() {
	try {
		const { data } = await Axios.request({
			baseURL: BASE_URL.srv.base,
			url: BASE_URL.srv.path.session,
			params: BASE_URL.srv.params.init,
			headers: { "user-agent": BASE_URL.srv["user-agent"] }
		}).catch((e) => e === null || e === void 0 ? void 0 : e.response);
		const Json = JSON.parse(parser.toJson(data));
		const identification = {
			...lowerCase(Json.RESULT.PARAMETERS.IDENTIFICATION)
		}
		const information = {
			...lowerCase(Json.RESULT.PARAMETERS.STEP_INFORMATION)
		}
		return { identification, information }
	} catch (e) {
		return false
	}
}
async function fireState(opts) {
	try {
		const { data } = await Axios.request({
			baseURL: BASE_URL.srv.base,
			url: BASE_URL.srv.path.answer,
			params: { ...opts },
			headers: { "user-agent": BASE_URL.srv["user-agent"] }
		}).catch((e) => e === null || e === void 0 ? void 0 : e.response);
		const Json = JSON.parse(parser.toJson(data));
		console.log(Json)
		console.log()
		const parameters = {
			...Json.RESULT.PARAMETERS
		}
		return lowerCase(parameters)
	} catch (e) {
		return false
	}
}
module.exports = { initEvent, fireState }
