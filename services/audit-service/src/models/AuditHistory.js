const mongoose = require("mongoose");

const auditHistorySchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, index: true },
    userName: { type: String, default: "" },
    ip:       { type: String },
    device:   { type: String },
    action:   { type: String, required: true },
    status:   { type: String, enum: ["SUCCESS", "FAILED"], required: true },
    meta:     { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp:{ type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditHistory", auditHistorySchema, "audit_history");
