const mongoose = require("mongoose");

const complianceReportSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    analysis: { type: mongoose.Schema.Types.ObjectId, required: true },
    issues: [{ title: String, description: String, regulationReference: String }],
    isCompliant: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ComplianceReport", complianceReportSchema, "compliance_report");
