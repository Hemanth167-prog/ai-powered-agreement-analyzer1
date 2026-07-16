const mongoose = require("mongoose");

const riskReportSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    analysis: { type: mongoose.Schema.Types.ObjectId, required: true },
    risks: [{ title: String, description: String, severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH"] } }],
    overallRiskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "LOW" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RiskReport", riskReportSchema);
