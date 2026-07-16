const axios = require("axios");
const Analysis = require("./models/Analysis");
const { selectRepository } = require("./legalRepository");
const { buildPrompt } = require("./promptBuilder");
const { callGemini, parseModelJson } = require("./geminiClient");
const { consume, AI_ANALYSIS_QUEUE } = require("/app/shared/rabbitmq");
const { recordAudit } = require("/app/shared/audit");

const CONTRACT_SERVICE_URL = process.env.CONTRACT_SERVICE_URL || "http://contract-service:4002";
const RISK_SERVICE_URL = process.env.RISK_SERVICE_URL || "http://risk-compliance-service:4004";

// Full AI pipeline, triggered off the queue:
// text -> country detection (already supplied) -> legal repository selection ->
// prompt builder -> Gemini API -> post-processing -> risk/compliance engine -> MongoDB -> notify
async function handleAnalysisJob(job) {
  const { contractId, ownerId, text, image, userCountry, employerCountry, clientCountry, contractType } = job;
  const isBidding = contractType === "bidding";

  const legalRepository = selectRepository([userCountry, employerCountry, clientCountry]);
  let prompt = "";
  let parsed = null;

  if (isBidding) {
    try {
      const BIDDING_SERVICE_URL = process.env.BIDDING_SERVICE_URL || "http://bidding-service:4009";
      const { data } = await axios.post(`${BIDDING_SERVICE_URL}/analyze`, {
        text,
        userCountry,
        employerCountry,
        clientCountry,
      });
      if (data.success) {
        parsed = data.data;
        parsed.__raw = JSON.parse(JSON.stringify(data.data));
        prompt = `Bidding Analysis via Python Service under ${legalRepository}`;
      } else {
        throw new Error(data.error || "Bidding analysis service returned success=false");
      }
    } catch (err) {
      console.error("Bidding analysis via python-service failed, falling back to standard analysis:", err.message);
    }
  }

  // Fallback to standard if not bidding or if python call failed
  if (!parsed) {
    prompt = buildPrompt({ text, userCountry, employerCountry, clientCountry, legalRepository });
    try {
      const { text: modelText, raw } = await callGemini(prompt, image);
      parsed = parseModelJson(modelText);
      parsed.__raw = raw;
    } catch (err) {
      console.error("Gemini call failed:", err.message);
      await recordAudit({ userId: ownerId, action: "AI_ANALYSIS", status: "FAILED", meta: { contractId, error: err.message } });
      throw err;
    }
  }

  const analysis = await Analysis.create({
    contract: contractId,
    owner: ownerId,
    legalRepository,
    detectedLanguage: parsed.detectedLanguage || "English",
    summary: parsed.summary,
    clauses: parsed.clauses || [],
    contractType: contractType || "standard",
    biddingLaws: parsed.biddingLaws || [],
    biddingRequirements: parsed.biddingRequirements || [],
    corporateLaws: parsed.corporateLaws || [],
    biddingDeadlines: parsed.biddingDeadlines || [],
    bidOpeningDate: parsed.bidOpeningDate || null,
    rawModelResponse: parsed.__raw,
    promptUsed: prompt,
    status: "COMPLETED",
  });

  // Link back to the contract via REST (CRUD -> REST, per requirements)
  await axios.post(`${CONTRACT_SERVICE_URL}/api/contracts/internal/link-analysis`, {
    contractId,
    aiAnalysisId: analysis._id,
  });

  // Hand off risk + compliance detection to risk-compliance-service via REST
  await axios.post(`${RISK_SERVICE_URL}/api/risk/internal/generate`, {
    contractId,
    ownerId,
    analysisId: analysis._id,
    risks: parsed.risks || [],
    complianceIssues: parsed.complianceIssues || [],
  });

  await recordAudit({ userId: ownerId, action: "AI_ANALYSIS", status: "SUCCESS", meta: { contractId, analysisId: analysis._id } });
}

function startConsumer() {
  consume(AI_ANALYSIS_QUEUE, handleAnalysisJob);
  console.log("ai-service is listening on the AI analysis queue");
}

module.exports = { startConsumer };
