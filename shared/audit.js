// Every service calls this to record an audit trail entry via REST.
const axios = require("axios");
const fs = require("fs");

const isDocker = fs.existsSync("/app") || process.env.DOCKER_ENV === "true";
const defaultAuditUrl = isDocker ? "http://audit-service:4008" : "http://localhost:4008";
const defaultNotificationUrl = isDocker ? "http://notification-service:4007" : "http://localhost:4007";

async function recordAudit({ userId, ip, device, action, status, meta = {} }) {
  try {
    await axios.post(
      `${process.env.AUDIT_SERVICE_URL || defaultAuditUrl}/api/audit`,
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
      `${process.env.NOTIFICATION_SERVICE_URL || defaultNotificationUrl}/api/notifications`,
      { userId, type, title, message, meta },
      { timeout: 3000 }
    );
  } catch (err) {
    console.error("Notification dispatch failed:", err.message);
  }
}

module.exports = { recordAudit, notifyUser };

