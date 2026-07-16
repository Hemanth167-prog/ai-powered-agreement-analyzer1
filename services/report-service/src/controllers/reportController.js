const axios = require("axios");
const { ok, fail } = require("/app/shared/response");
const { recordAudit } = require("/app/shared/audit");

const CONTRACT_SERVICE_URL = process.env.CONTRACT_SERVICE_URL || "http://contract-service:4002";
const RISK_SERVICE_URL = process.env.RISK_SERVICE_URL || "http://risk-compliance-service:4004";
const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || "http://audit-service:4008";

// Reports are assembled on demand from every other service - no manual data entry,
// per requirements. This service owns no primary data of its own, only aggregates it.
exports.buildContractReport = async (req, res) => {
  try {
    const { contractId } = req.params;
    const auth = { headers: { authorization: req.headers.authorization } };

    const [contractRes, riskRes, complianceRes, aiRes] = await Promise.allSettled([
      axios.get(`${CONTRACT_SERVICE_URL}/api/contracts/${contractId}`, auth),
      axios.get(`${RISK_SERVICE_URL}/api/risk/${contractId}`, auth),
      axios.get(`${RISK_SERVICE_URL}/api/compliance/${contractId}`, auth),
      axios.get(`${process.env.AI_SERVICE_URL || "http://ai-service:4003"}/api/ai/analysis/contract/${contractId}`, auth),
    ]);

    const report = {
      contract: contractRes.status === "fulfilled" ? contractRes.value.data.data : null,
      riskReport: riskRes.status === "fulfilled" ? riskRes.value.data.data : null,
      complianceReport: complianceRes.status === "fulfilled" ? complianceRes.value.data.data : null,
      analysis: aiRes.status === "fulfilled" ? aiRes.value.data.data : null,
      generatedAt: new Date().toISOString(),
    };

    if (!report.contract) return fail(res, "Contract not found or you don't have access", 404);

    await recordAudit({ userId: req.user.id, action: "REPORT_GENERATION", status: "SUCCESS", meta: { contractId } });

    return ok(res, report, "Report generated");
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.buildUserActivityReport = async (req, res) => {
  try {
    const auth = { headers: { authorization: req.headers.authorization } };
    const [contractsRes, auditRes] = await Promise.allSettled([
      axios.get(`${CONTRACT_SERVICE_URL}/api/contracts`, auth),
      axios.get(`${AUDIT_SERVICE_URL}/api/audit/me`, auth),
    ]);

    return ok(res, {
      contracts: contractsRes.status === "fulfilled" ? contractsRes.value.data.data : [],
      auditTrail: auditRes.status === "fulfilled" ? auditRes.value.data.data : [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
};
