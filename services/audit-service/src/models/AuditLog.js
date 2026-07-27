const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, index: true },
    userName: { type: String, default: "" },  // stored at write-time so admin trail needs no join
    ip:       { type: String },
    device:   { type: String },
    action:   { type: String, required: true }, // LOGIN, LOGOUT, UPLOAD, DELETE, DOWNLOAD, AI_ANALYSIS, REPORT_GENERATION, ADMIN_ACTION...
    status:   { type: String, enum: ["SUCCESS", "FAILED"], required: true },
    meta:     { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp:{ type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema, "audit_logs");
