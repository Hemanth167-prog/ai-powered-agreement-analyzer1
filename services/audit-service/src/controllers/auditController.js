const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");
const AuditHistory = require("../models/AuditHistory");
const { ok, fail } = require("/app/shared/response");

// Called internally by every other service (REST) for every important operation.
exports.create = async (req, res) => {
  try {
    const { userId, userName, ip, device, action, status, meta, timestamp } = req.body;
    
    // Resolve userName dynamically from MongoDB if not provided in payload
    let resolvedUserName = userName || "";
    if (!resolvedUserName && userId) {
      try {
        const db = mongoose.connection.db;
        const user = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId(userId) });
        if (user) {
          resolvedUserName = user.name;
        }
      } catch (dbErr) {
        console.error("Failed to resolve userName for audit log:", dbErr.message);
      }
    }

    const logData = { userId, userName: resolvedUserName, ip, device, action, status, meta, timestamp };
    const log = await AuditLog.create(logData);
    await AuditHistory.create(logData);
    return ok(res, log, "Audit recorded", 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Returns only the requesting user's own logs — users CANNOT see each other's trails.
exports.myLogs = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // Find all soft-deleted contracts owned by this user
    const deletedContracts = await db.collection("contract").find({
      owner: new mongoose.Types.ObjectId(req.user.id),
      isDeleted: true
    }).toArray();
    
    const deletedIds = deletedContracts.map(c => c._id.toString());
    const deletedObjectIds = deletedContracts.map(c => c._id);
    
    const query = {
      userId: new mongoose.Types.ObjectId(req.user.id),
      $and: [
        { "meta.contractId": { $nin: [...deletedIds, ...deletedObjectIds] } },
        { "meta.contract": { $nin: [...deletedIds, ...deletedObjectIds] } }
      ]
    };
    
    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(200);
    return ok(res, logs);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Returns all logs from every user — admin only (enforced by requireRole middleware on the route).
exports.allLogs = async (req, res) => {
  const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(500);
  return ok(res, logs);
};

