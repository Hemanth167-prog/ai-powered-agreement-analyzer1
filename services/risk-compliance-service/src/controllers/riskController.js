const axios = require("axios");
const RiskReport = require("../models/RiskReport");
const ComplianceReport = require("../models/ComplianceReport");
const { ok, fail } = require("/app/shared/response");
const { recordAudit, notifyUser } = require("/app/shared/audit");

const CONTRACT_SERVICE_URL = process.env.CONTRACT_SERVICE_URL || "http://contract-service:4002";

function computeOverallRisk(risks) {
  if (risks.some((r) => r.severity === "HIGH")) return "HIGH";
  if (risks.some((r) => r.severity === "MEDIUM")) return "MEDIUM";
  return "LOW";
}

// Called internally by ai-service (REST) right after Gemini post-processing.
exports.generateReports = async (req, res) => {
  try {
    const { contractId, ownerId, analysisId, risks = [], complianceIssues = [] } = req.body;

    const riskReport = await RiskReport.create({
      contract: contractId,
      owner: ownerId,
      analysis: analysisId,
      risks,
      overallRiskLevel: computeOverallRisk(risks),
    });

    const complianceReport = await ComplianceReport.create({
      contract: contractId,
      owner: ownerId,
      analysis: analysisId,
      issues: complianceIssues,
      isCompliant: complianceIssues.length === 0,
    });

    // Keep the contract record linked - no orphan records.
    await axios.post(`${CONTRACT_SERVICE_URL}/api/contracts/internal/link-risk`, {
      contractId,
      riskReportId: riskReport._id,
    });
    await axios.post(`${CONTRACT_SERVICE_URL}/api/contracts/internal/link-compliance`, {
      contractId,
      complianceReportId: complianceReport._id,
    });

    if (riskReport.overallRiskLevel === "HIGH") {
      await notifyUser({
        userId: ownerId,
        type: "RISK_DETECTED",
        title: "High risk detected in your contract",
        message: "The AI analysis flagged high-severity risks. Please review.",
        meta: { contractId, riskReportId: riskReport._id },
      });
    }
    if (!complianceReport.isCompliant) {
      await notifyUser({
        userId: ownerId,
        type: "COMPLIANCE_ISSUE",
        title: "Compliance issue found",
        message: "The AI analysis flagged potential compliance issues in your contract.",
        meta: { contractId, complianceReportId: complianceReport._id },
      });
    }

    await recordAudit({ userId: ownerId, action: "RISK_COMPLIANCE_ANALYSIS", status: "SUCCESS", meta: { contractId } });

    return ok(res, { riskReport, complianceReport }, "Risk and compliance reports generated", 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.getRiskReport = async (req, res) => {
  try {
    let query = { contract: req.params.contractId, owner: req.user.id };
    if (req.user.role === "admin") {
      query = { contract: req.params.contractId };
    }
    const report = await RiskReport.findOne(query);
    if (!report) return fail(res, "Risk report not found", 404);
    return ok(res, report);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.getComplianceReport = async (req, res) => {
  try {
    let query = { contract: req.params.contractId, owner: req.user.id };
    if (req.user.role === "admin") {
      query = { contract: req.params.contractId };
    }
    const report = await ComplianceReport.findOne(query);
    if (!report) return fail(res, "Compliance report not found", 404);
    return ok(res, report);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};
