const AuditLog = require("../models/AuditLog");
const { ok, fail } = require("/app/shared/response");

// Called internally by every other service (REST) for every important operation.
exports.create = async (req, res) => {
  try {
    const { userId, userName, ip, device, action, status, meta, timestamp } = req.body;
    const log = await AuditLog.create({ userId, userName: userName || "", ip, device, action, status, meta, timestamp });
    return ok(res, log, "Audit recorded", 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Returns only the requesting user's own logs — users CANNOT see each other's trails.
exports.myLogs = async (req, res) => {
  const logs = await AuditLog.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200);
  return ok(res, logs);
};

// Returns all logs from every user — admin only (enforced by requireRole middleware on the route).
exports.allLogs = async (req, res) => {
  const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(500);
  return ok(res, logs);
};

