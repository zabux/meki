const axios = require("axios");
const {
  Configuration,
  OpenAIApi
} = require("openai");

const createRequest = async (opts) => {
  if (typeof opts !== "object") {
    throw new Error("Invalid body")
  }
  const { url, content } = opts;
  if (!url || !content) {
    throw new Error("Missing body > (url & content)")
  }
  const json = await openai.createChatCompletion({
    method: "POST",
    headers: {
      ["Authorization"]: `Bearer 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`,
      ["User-Agent"]: "Frieren-Scraper (0.0.1x)"
    },
    data: content
  }).catch((e) => e === null || e === void 0 ? void 0 : e.response);

  // Check if the data field is present in the response
  if (!data) {
    throw new Error("No data received from OpenAI API");
  }

  return data;
}

exports.chatAI = async (content) => {
  if (typeof content !== "object" || !(Array.isArray(content) && content.length)) {
    throw new Error("Invalid body");
  }
  return await createRequest({
    url: "/completions",
    content
  })
}

exports._get = async (url) => {
  return await axios.get(url, {
    headers: {
      ["User-Agent"]: "okhttp/4.1.9"
    }
  }).catch((e) => e === null || e === void 0 ? void 0 : e.response)
}
