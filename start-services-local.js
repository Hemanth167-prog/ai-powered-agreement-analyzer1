/**
 * Local Microservices Runner
 * --------------------------
 * Spawns and manages all microservices locally on the host machine.
 * Directs outputs to console with service prefixes and color codes.
 * Ensures clean termination on Ctrl+C (SIGINT).
 */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Load environment variables from .env
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const services = [
  { name: "gateway", path: "gateway/src/index.js", color: "\x1b[36m" }, // Cyan
  { name: "auth", path: "services/auth-service/src/index.js", color: "\x1b[32m" }, // Green
  { name: "contract", path: "services/contract-service/src/index.js", color: "\x1b[33m" }, // Yellow
  { name: "ai", path: "services/ai-service/src/index.js", color: "\x1b[35m" }, // Magenta
  { name: "risk", path: "services/risk-compliance-service/src/index.js", color: "\x1b[34m" }, // Blue
  { name: "chat", path: "services/chat-service/src/index.js", color: "\x1b[37m" }, // White
  { name: "report", path: "services/report-service/src/index.js", color: "\x1b[96m" }, // Light Cyan
  { name: "notification", path: "services/notification-service/src/index.js", color: "\x1b[92m" }, // Light Green
  { name: "audit", path: "services/audit-service/src/index.js", color: "\x1b[93m" }, // Light Yellow
];

// Add Python bidding-service if Python is available
const hasVenv = fs.existsSync(path.join(__dirname, ".venv"));
const pythonCmd = hasVenv 
  ? path.join(__dirname, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python") 
  : "python";
  
services.push({
  name: "bidding",
  cmd: pythonCmd,
  path: "services/bidding-service/src/main.py",
  color: "\x1b[95m", // Light Magenta
});

const children = [];

console.log("\x1b[1m\x1b[34m=== Starting Legal AI Platform Services Locally ===\x1b[0m\n");

services.forEach((service) => {
  const fullPath = path.resolve(__dirname, service.path);
  const args = service.cmd ? [fullPath] : [fullPath];
  const cmd = service.cmd || "node";

  console.log(`Spawning [${service.name}] (${cmd} ${service.path})...`);
  const child = spawn(cmd, args, {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: getPort(service.name) }
  });

  child.stdout.on("data", (data) => {
    formatLog(service.name, service.color, data);
  });

  child.stderr.on("data", (data) => {
    formatLog(service.name, "\x1b[31m", data); // Red for error
  });

  child.on("error", (err) => {
    console.error(`\x1b[31m[${service.name}] failed to start: ${err.message}\x1b[0m`);
  });

  child.on("exit", (code, signal) => {
    console.log(`\x1b[33m[${service.name}] exited with code ${code} and signal ${signal}\x1b[0m`);
  });

  children.push(child);
});

function getPort(name) {
  const ports = {
    gateway: 4000,
    auth: 4001,
    contract: 4002,
    ai: 4003,
    risk: 4004,
    chat: 4005,
    report: 4006,
    notification: 4007,
    audit: 4008,
    bidding: 4009
  };
  return ports[name];
}

function formatLog(name, color, data) {
  const text = data.toString().trim();
  if (!text) return;
  text.split(/\r?\n/).forEach((line) => {
    console.log(`${color}[${name}]\x1b[0m ${line}`);
  });
}

// Graceful exit handler
process.on("SIGINT", () => {
  console.log("\n\x1b[1m\x1b[33mStopping all services...\x1b[0m");
  children.forEach((child) => {
    try {
      child.kill("SIGTERM");
    } catch (e) {}
  });
  setTimeout(() => process.exit(0), 500);
});
