const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, required: true }, // AI_ANALYSIS_COMPLETED, RISK_DETECTED, CONTRACT_EXPIRING, COMPLIANCE_ISSUE, REVIEW_REQUIRED...
    title: { type: String, required: true },
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
