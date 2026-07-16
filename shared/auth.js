// Shared JWT + role validation middleware, used by the gateway and every service
const jwt = require("jsonwebtoken");

function verifyJWT(req, res, next) {
  const header = req.headers["authorization"];
  const token = header && header.startsWith("Bearer ") ? header.split(" ")[1] : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing authentication token" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { verifyJWT, requireRole };
