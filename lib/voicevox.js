const Axios = require("axios");
const https = require("https");
const fs = require("fs");
const { v4 } = require("uuid");

const INIT = {
	translate: {
		api: {
			secret: "y5gxlSuO7qHx6+25GSyvDg==",
			base: "https://matrix.laserapps.net",
			path: {
				detect: "/translate/api/language_detection/",
				translation: "/translate/api/translation/",
			},
		},
	},
}

async function translate(opts) {
	const { data } = await Axios.request({
		baseURL: INIT.translate.api.base,
		url: INIT.translate.api.path.translation,
		params: { ...opts },
		headers: {
			["secret"]: INIT.translate.api.secret,
			["User-Agent"]: "okhttp/4.9.3",
		}
	}).catch((e) => e === null || e === void 0 ? void 0 : e.response);
	if (data && data.code === 0) {
		return (Array.isArray(data.data) && data.data.length ? data.data[0] : data.data)
	} else {
		return false
	}
}

async function detect_all_language(text, toLang = "ja") {
	let result = false
	const { data } = await Axios.request({
		baseURL: INIT.translate.api.base,
		url: INIT.translate.api.path.detect,
		params: {
			t: text,
		},
		headers: {
			["secret"]: INIT.translate.api.secret,
			["User-Agent"]: "okhttp/4.9.3",
		}
	}).catch((e) => e === null || e === void 0 ? void 0 : e.response);
	if (data && data.code === 0) {
        result = await translate({
			t: text,
			tlc: toLang,
			slc: (Array.isArray(data.data) && data.data.length ? data.data[0].lang : data?.data?.lang)
		});
	}
	return result
}

module.exports = {
	voicevox: {
		detect_all_language,
		translate
	}
}
