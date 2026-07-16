const axios = require("axios");

// Calls Gemini API. Only ever invoked from the backend (ai-service) - the frontend
// never talks to Gemini directly, per requirements.
async function callGemini(prompt, image = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts = [];
  if (image && image.data) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    });
  }
  parts.push({ text: prompt });

  const response = await axios.post(
    url,
    { contents: [{ parts }] },
    { headers: { "Content-Type": "application/json" }, timeout: 60000 }
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return { text, raw: response.data };
}

// Post-processing: Gemini is asked for pure JSON but may still wrap it in markdown fences.
function parseModelJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return { summary: cleaned, clauses: [], risks: [], complianceIssues: [] };
  }
}

module.exports = { callGemini, parseModelJson };
