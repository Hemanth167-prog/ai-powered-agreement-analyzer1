const axios = require("axios");

async function test() {
  const apiKey = process.env.GEMINI_API_KEY || "GEMINI_API_KEY_PLACEHOLDER";
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log("Testing Gemini API...");
  console.log("URL:", url.replace(apiKey, "HIDDEN_KEY"));
  console.log("Model:", model);

  try {
    const res = await axios.post(
      url,
      { contents: [{ parts: [{ text: "Hello" }] }] },
      { headers: { "Content-Type": "application/json" } }
    );
    console.log("Success! Response:", res.data);
  } catch (err) {
    console.error("Failed with status:", err.response?.status);
    console.error("Response Headers:", err.response?.headers);
    console.error("Response Body:", JSON.stringify(err.response?.data, null, 2));
  }
}

test();
