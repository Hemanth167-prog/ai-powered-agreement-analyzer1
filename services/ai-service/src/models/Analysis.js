const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    contract:         { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    owner:            { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    legalRepository:  { type: String, required: true },
    detectedLanguage: { type: String, default: "English" }, // auto-detected original language of the document
    summary:          { type: String },
    clauses:          [{ title: String, text: String, category: String }],
    contractType:     { type: String, enum: ["standard", "bidding", "mou"], default: "standard" },
    biddingLaws:      [{ lawName: String, description: String }],
    biddingRequirements: [{ title: String, description: String }],
    corporateLaws:    [{ lawName: String, description: String }],
    // ── Bid dates (bidding contracts only) ───────────────────────────────────
    biddingDeadlines: [{ title: String, date: String, description: String }],
    bidOpeningDate:   { type: String, default: null },
    // ─────────────────────────────────────────────────────────────────────────
    favorability: {
      userPercentage:     { type: Number },
      oppositePercentage: { type: Number },
      userRationale:      { type: String },
      oppositeRationale:  { type: String }
    },
    rawModelResponse: { type: mongoose.Schema.Types.Mixed },
    promptUsed:       { type: String },
    status:           { type: String, enum: ["COMPLETED", "FAILED"], default: "COMPLETED" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", analysisSchema, "ai_analysis");
