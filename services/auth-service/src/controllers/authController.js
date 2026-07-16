const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");
const { ok, fail } = require("/app/shared/response");
const { recordAudit } = require("/app/shared/audit");

function signTokens(user) {
  const payload = { id: user._id.toString(), email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, country } = req.body;
    if (!name || !email || !password) return fail(res, "name, email and password are required", 400);

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return fail(res, "An account with this email already exists", 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, country });

    const tokens = signTokens(user);
    await recordAudit({
      userId: user._id,
      ip: req.ip,
      device: req.headers["user-agent"],
      action: "REGISTER",
      status: "SUCCESS",
    });

    return ok(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, ...tokens }, "Account created", 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, "email and password are required", 400);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      await recordAudit({ ip: req.ip, device: req.headers["user-agent"], action: "LOGIN", status: "FAILED", meta: { email } });
      return fail(res, "Invalid credentials", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordAudit({ userId: user._id, ip: req.ip, device: req.headers["user-agent"], action: "LOGIN", status: "FAILED" });
      return fail(res, "Invalid credentials", 401);
    }

    const tokens = signTokens(user);
    await recordAudit({ userId: user._id, ip: req.ip, device: req.headers["user-agent"], action: "LOGIN", status: "SUCCESS" });

    return ok(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, ...tokens }, "Login successful");
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.logout = async (req, res) => {
  await recordAudit({ userId: req.user.id, ip: req.ip, device: req.headers["user-agent"], action: "LOGOUT", status: "SUCCESS" });
  return ok(res, null, "Logged out");
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash");
  if (!user) return fail(res, "User not found", 404);
  return ok(res, user);
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return fail(res, "refreshToken is required", 400);
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const accessToken = jwt.sign(
      { id: payload.id, email: payload.email, role: payload.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    return ok(res, { accessToken });
  } catch (err) {
    return fail(res, "Invalid refresh token", 401);
  }
};

// Update user heartbeat active timestamp
exports.heartbeat = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { lastActiveAt: new Date() });
    return res.json({ success: true });
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Admin: Get all users
exports.adminGetUsers = async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    return ok(res, users);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Admin: Get active users count (based on last 15s heartbeats)
exports.adminGetActiveCount = async (req, res) => {
  try {
    const threshold = new Date(Date.now() - 15000); // 15 seconds
    const activeUsers = await User.find({ lastActiveAt: { $gte: threshold } }).select("-passwordHash");
    return ok(res, { count: activeUsers.length, activeUsers });
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Admin: Delete user and their documents
exports.adminDeleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return fail(res, "User not found", 404);

    if (user._id.toString() === req.user.id) {
      return fail(res, "You cannot delete your own admin account", 400);
    }

    await User.findByIdAndDelete(userId);

    // Call contract-service container over REST to delete contracts and files
    try {
      const CONTRACT_SERVICE_URL = process.env.CONTRACT_SERVICE_URL || "http://contract-service:4002";
      await axios.delete(`${CONTRACT_SERVICE_URL}/api/contracts/internal/users/${userId}`, {
        timeout: 5000
      });
    } catch (err) {
      console.error(`Failed to clean up contracts for deleted user ${userId}:`, err.message);
    }

    await recordAudit({
      userId: req.user.id,
      ip: req.ip,
      device: req.headers["user-agent"],
      action: "ADMIN_DELETE_USER",
      status: "SUCCESS",
      meta: { deletedUserId: userId }
    });

    return ok(res, null, "User and their data deleted successfully");
  } catch (err) {
    return fail(res, err.message, 500);
  }
};
