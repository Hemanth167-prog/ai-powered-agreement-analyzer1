const mongoose = require("mongoose");

// Central document: every other collection (ai_analysis, risk_reports, compliance_reports,
// chat_history) references this via ObjectId so nothing is ever an orphan record.
const contractSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // ref -> users (auth-service)
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    extractedText: { type: String },
    userCountry: { type: String, required: true },
    employerCountry: { type: String, required: true },
    clientCountry: { type: String },
    contractType: { type: String, enum: ["standard", "bidding", "mou"], default: "standard" },
    status: {
      type: String,
      enum: ["UPLOADED", "PROCESSING", "ANALYZED", "FAILED"],
      default: "UPLOADED",
    },
    aiAnalysisId: { type: mongoose.Schema.Types.ObjectId, default: null }, // ref -> ai_analysis
    riskReportId: { type: mongoose.Schema.Types.ObjectId, default: null }, // ref -> risk_reports
    complianceReportId: { type: mongoose.Schema.Types.ObjectId, default: null }, // ref -> compliance_reports
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contract", contractSchema, "contract");
