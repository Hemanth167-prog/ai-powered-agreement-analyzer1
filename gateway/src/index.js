/**
 * API Gateway
 * -----------
 * Single public entry point for the whole platform.
 * Flow enforced here: Firewall/WAF (infra layer) -> Reverse Proxy (this) ->
 * JWT validation -> Rate limiting -> Route to the correct microservice.
 *
 * Public routes (auth register/login) skip JWT validation; everything else requires it.
 */
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");
const jwt = require("jsonwebtoken");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));

// Parse JSON body for firewall inspection (only parses if content-type is application/json)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Malicious payload checker for NoSQL injection, SQL injection, XSS, and Path Traversal
function hasMaliciousPayload(data) {
  if (!data) return null;
  const str = typeof data === "string" ? data : JSON.stringify(data);

  // NoSQL Injection: check for keys starting with $ which MongoDB treats as operators
  const nosqlPattern = /\$[a-zA-Z]+/g;
  if (nosqlPattern.test(str)) {
    const matched = str.match(nosqlPattern);
    const blockedOperators = ["$gt", "$ne", "$where", "$or", "$and", "$regex", "$nin", "$eq", "$lt", "$lte", "$gte"];
    if (matched && matched.some(op => blockedOperators.includes(op))) {
      return "NoSQL Injection Attempt";
    }
  }

  // XSS attack vectors
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi
  ];
  for (const pattern of xssPatterns) {
    if (pattern.test(str)) return "XSS Attack Detected";
  }

  // SQL Injection patterns
  const sqlPatterns = [
    /\bunion\s+select\b/gi,
    /\bselect\s+.*\s+from\b/gi,
    /\bor\s+1\s*=\s*1\b/gi,
    /["']\s*or\s*["']1["']\s*=\s*["']1/gi
  ];
  for (const pattern of sqlPatterns) {
    if (pattern.test(str)) return "SQL Injection Attempt";
  }

  // Path Traversal
  if (/\.\.\//.test(str) || /\.\.\\/.test(str)) {
    return "Path Traversal Attempt";
  }

  return null;
}

// Firewall middleware
app.use((req, res, next) => {
  const checkFields = {
    path: req.path,
    query: req.query,
    headers: {
      "user-agent": req.headers["user-agent"],
      "referer": req.headers["referer"]
    },
    body: req.body
  };

  const threat = hasMaliciousPayload(checkFields);
  if (threat) {
    console.warn(`[FIREWALL SHIELD] Blocked ${threat} from IP ${req.ip} on ${req.method} ${req.path}`);
    return res.status(403).json({
      success: false,
      message: "Access Denied: Security policy violation detected.",
      threatType: threat
    });
  }
  next();
});

// Global rate limiter - protects every downstream service
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please slow down." },
  })
);

const SERVICES = {
  "/api/auth": process.env.AUTH_SERVICE_URL || "http://auth-service:4001",
  "/api/contracts": process.env.CONTRACT_SERVICE_URL || "http://contract-service:4002",
  "/api/ai": process.env.AI_SERVICE_URL || "http://ai-service:4003",
  "/api/risk": process.env.RISK_SERVICE_URL || "http://risk-compliance-service:4004",
  "/api/compliance": process.env.RISK_SERVICE_URL || "http://risk-compliance-service:4004",
  "/api/chat": process.env.CHAT_SERVICE_URL || "http://chat-service:4005",
  "/api/reports": process.env.REPORT_SERVICE_URL || "http://report-service:4006",
  "/api/notifications": process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:4007",
  "/api/audit": process.env.AUDIT_SERVICE_URL || "http://audit-service:4008",
};

// Routes that don't require a token (registration / login)
const PUBLIC_PATHS = ["/api/auth/register", "/api/auth/login", "/api/auth/refresh"];

function isPublic(path) {
  return PUBLIC_PATHS.some((p) => path.startsWith(p));
}

function gatewayJwtCheck(req, res, next) {
  if (isPublic(req.path)) return next();
  const header = req.headers["authorization"];
  const token = header && header.startsWith("Bearer ") ? header.split(" ")[1] : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing authentication token" });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

app.get("/health", (req, res) => res.json({ success: true, message: "Gateway is healthy" }));

app.use(gatewayJwtCheck);

Object.entries(SERVICES).forEach(([prefix, target]) => {
  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      onProxyReq: fixRequestBody,
      pathRewrite: { [`^${prefix}`]: prefix }, // keep original path, services mount their own routers on the same prefix
      onError: (err, req, res) => {
        console.error(`Proxy error for ${prefix}:`, err.message);
        res.status(502).json({ success: false, message: "Upstream service unavailable" });
      },
    })
  );
});

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API Gateway listening on port ${PORT}`));
