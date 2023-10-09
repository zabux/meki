const axios = require("axios");
const { fromBuffer } = require("file-type");
const fs = require("fs");

async function uploadImage(buffer) {
	const { ext, mime } = await fromBuffer(buffer);
	const form = new FormData();
	const blob = new Blob([Buffer.from(buffer)], { type: mime });
	form.append("file", blob, "tmp." + ext);

	const { data } = await axios
		.request({
			url: "https://telegra.ph/upload",
			method: "POST",
			data: form,
		})
		.catch((e) => (e === null || e === void 0 ? void 0 : e.response));
	if (Array.isArray(data) && data.length) {
		return "https://telegra.ph" + data[0].src;
	}
}
module.exports = {
	uploadImage,
};
