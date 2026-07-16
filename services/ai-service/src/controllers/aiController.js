const Analysis = require("../models/Analysis");
const { ok, fail } = require("/app/shared/response");
const axios = require("axios");
const { callGemini } = require("../geminiClient");

const CONTRACT_SERVICE_URL = process.env.CONTRACT_SERVICE_URL || "http://contract-service:4002";

exports.getAnalysisByContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    let query = { contract: contractId, owner: req.user.id };
    if (req.user.role === "admin") {
      query = { contract: contractId };
    }
    const analysis = await Analysis.findOne(query);
    if (!analysis) return fail(res, "Analysis not found", 404);
    return ok(res, analysis);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.chatAnswer = async (req, res) => {
  try {
    const { contractId, question } = req.body;
    if (!contractId || !question) {
      return fail(res, "contractId and question are required", 400);
    }

    // Call contract-service internally to get contract text
    let contractText = "";
    try {
      const response = await axios.get(`${CONTRACT_SERVICE_URL}/api/contracts/internal/${contractId}`);
      if (response.data && response.data.success) {
        contractText = response.data.data.extractedText || "";
      }
    } catch (err) {
      console.error(`Failed to fetch contract ${contractId} internally:`, err.message);
    }

    const prompt = `You are a helpful legal contract assistant.
Here is the text of the contract:
"""
${contractText.slice(0, 15000) || "[No text extracted from this contract]"}
"""

Please answer the user's question about this contract.
Question: "${question}"

Provide a direct, concise, and professional answer based only on the contract contents. If the contract does not contain the answer, explain that politely.`;

    const { text: answer } = await callGemini(prompt);
    
    return ok(res, { answer });
  } catch (err) {
    return fail(res, err.message, 500);
  }
};
