const Analysis = require("../models/Analysis");
const { ok, fail } = require("/app/shared/response");
const axios = require("axios");
const { callGemini } = require("../geminiClient");

const CONTRACT_SERVICE_URL = process.env.CONTRACT_SERVICE_URL || "http://contract-service:4002";

const { getInternationalLawsForCountries } = require("../legalRepository");

exports.getAnalysisByContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    let query = { contract: contractId, owner: req.user.id };
    if (req.user.role === "admin") {
      query = { contract: contractId };
    }
    let analysis = await Analysis.findOne(query);
    if (!analysis) return fail(res, "Analysis not found", 404);

    const obj = analysis.toObject();

    // Fetch contract details to get exact countries selected by user
    let userCountry = "IN";
    let employerCountry = "US";
    let clientCountry = "";

    try {
      const cRes = await axios.get(`${CONTRACT_SERVICE_URL}/api/contracts/internal/${contractId}`);
      if (cRes.data && cRes.data.success && cRes.data.data) {
        userCountry = cRes.data.data.userCountry || userCountry;
        employerCountry = cRes.data.data.employerCountry || employerCountry;
        clientCountry = cRes.data.data.clientCountry || clientCountry;
      }
    } catch (e) {}

    const fullCountryLaws = getInternationalLawsForCountries([userCountry, employerCountry, clientCountry]);

    if (!obj.corporateLaws || obj.corporateLaws.length === 0) {
      obj.corporateLaws = fullCountryLaws;
    }
    if (!obj.biddingLaws || obj.biddingLaws.length === 0) {
      obj.biddingLaws = fullCountryLaws.filter(l => l.lawName.toLowerCase().includes("procurement") || l.lawName.toLowerCase().includes("riigihange") || l.lawName.toLowerCase().includes("directive") || l.lawName.toLowerCase().includes("tender"));
      if (obj.biddingLaws.length === 0) obj.biddingLaws = fullCountryLaws.slice(0, 3);
    }

    return ok(res, obj);
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

    const prompt = `You are a strict legal assistant specializing exclusively in statutory laws and regulations impacting contracts.
Here is the text of the contract:
"""
${contractText || "[No text extracted from this contract]"}
"""

User Question: "${question}"

Instructions:
1. You must answer questions ONLY relating to laws, regulations, legal acts, statutes, compliance, and legal frameworks. If the user asks about any kind of laws/regulations (regardless of whether they are explicitly present in the contract text or not), you must answer that query in detail, explaining how the law works and its relevance or impact.
2. In your response, explicitly state which specific statutory laws, legal acts, or regulations (e.g. Labor Laws, GDPR, Companies Act, etc.) apply to this issue and whether they are explicitly mentioned in the contract or not.
3. If the user's question is not about laws, regulations, or legal statutes, politely inform them that this assistant only answers questions related to legal statutes, compliance regulations, and laws.
4. Keep the answer professional, direct, and focused solely on the laws.`;

    let answer = "I am unable to answer right now due to service limits. Please check again later.";
    try {
      const result = await callGemini(prompt);
      answer = result.text;
    } catch (err) {
      console.warn("Gemini chat answer failed, falling back to local fallback response:", err.message);
      const q = question.toLowerCase();
      if (q.includes("termination") || q.includes("terminate") || q.includes("notice")) {
        answer = "Under statutory labor laws and regulations, termination notice periods must adhere to minimum employment standards. Please consult local labor statutes of the governing jurisdiction.";
      } else if (q.includes("payment") || q.includes("fee") || q.includes("price") || q.includes("salary")) {
        answer = "Payment and compensation clauses are subject to statutory laws like the Minimum Wages Act or local tax regulations. Please review local financial and employment compliance statutes.";
      } else if (q.includes("governing law") || q.includes("jurisdiction") || q.includes("law")) {
        answer = "The contract is governed by the statutory laws and regulations of the jurisdiction selected by the client in the upload details. All clauses must comply with the statutes of that region.";
      } else {
        answer = "This assistant is configured to focus entirely on statutory laws, legal acts, and regulations governing this contract. Please ask a question about specific laws or compliance requirements.";
      }
    }
    
    return ok(res, { answer });
  } catch (err) {
    console.error("Error in chatAnswer controller:", err);
    return fail(res, err.message, 500);
  }
};
