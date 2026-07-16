// Every service calls this to record an audit trail entry via REST.
const axios = require("axios");

async function recordAudit({ userId, ip, device, action, status, meta = {} }) {
  try {
    await axios.post(
      `${process.env.AUDIT_SERVICE_URL || "http://audit-service:4008"}/api/audit`,
      { userId, ip, device, action, status, meta, timestamp: new Date().toISOString() },
      { timeout: 3000 }
    );
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
}

async function notifyUser({ userId, type, title, message, meta = {} }) {
  try {
    await axios.post(
      `${process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:4007"}/api/notifications`,
      { userId, type, title, message, meta },
      { timeout: 3000 }
    );
  } catch (err) {
    console.error("Notification dispatch failed:", err.message);
  }
}

module.exports = { recordAudit, notifyUser };
