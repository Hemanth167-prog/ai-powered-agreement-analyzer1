const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    contractId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    contract: { type: mongoose.Schema.Types.Mixed, default: null },
    riskReport: { type: mongoose.Schema.Types.Mixed, default: null },
    complianceReport: { type: mongoose.Schema.Types.Mixed, default: null },
    analysis: { type: mongoose.Schema.Types.Mixed, default: null },
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema, "reports");
