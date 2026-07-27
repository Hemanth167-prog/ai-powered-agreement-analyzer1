const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");
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

    // Email format validation
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return fail(res, "Email address must contain only lowercase letters", 400);
    }
    const emailParts = email.split('@');
    if (emailParts.length === 2 && emailParts[1].toLowerCase() === 'gmail.com') {
      const username = emailParts[0];
      if (username.length < 6 || username.length > 30) {
        return fail(res, "Gmail username must be between 6 and 30 characters", 400);
      }
      if (!/^[a-zA-Z0-9.]+$/.test(username)) {
        return fail(res, "Gmail username can only contain letters, numbers, and periods", 400);
      }
      if (/\.\./.test(username)) {
        return fail(res, "Gmail username cannot contain consecutive periods", 400);
      }
      if (username.startsWith('.') || username.endsWith('.')) {
        return fail(res, "Gmail username cannot start or end with a period", 400);
      }
    }

    // Name validation (Username format check, e.g. Hemanth or Hemanth1234)
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return fail(res, "Name must be between 2 and 50 characters", 400);
    }
    const nameRegex = /^[a-zA-Z]+[0-9]*$/;
    if (!nameRegex.test(trimmedName)) {
      return fail(res, "Name must contain only letters, optionally followed by numbers (e.g., Hemanth or Hemanth1234)", 400);
    }

    // Check if the name already exists (case-insensitive check)
    const nameConflict = await User.findOne({
      name: { $regex: new RegExp("^" + trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$", "i") }
    });
    if (nameConflict) {
      return fail(res, "This name is already taken. Please choose a different name.", 400);
    }

    // Check if the email already exists (including Gmail dot normalization)
    const normalizedEmailInput = email.toLowerCase().trim();
    let existing = await User.findOne({ email: normalizedEmailInput });
    if (!existing) {
      const emailParts = normalizedEmailInput.split('@');
      if (emailParts.length === 2 && emailParts[1] === 'gmail.com') {
        const normalizedUsername = emailParts[0].replace(/\./g, '');
        const gmailUsers = await User.find({ email: /@gmail\.com$/i });
        existing = gmailUsers.find(u => {
          const uParts = u.email.toLowerCase().split('@');
          return uParts[0].replace(/\./g, '') === normalizedUsername;
        });
      }
    }
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

    // Find user for login (including Gmail dot normalization lookup)
    const normalizedEmailInput = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmailInput });
    if (!user) {
      const emailParts = normalizedEmailInput.split('@');
      if (emailParts.length === 2 && emailParts[1] === 'gmail.com') {
        const normalizedUsername = emailParts[0].replace(/\./g, '');
        const gmailUsers = await User.find({ email: /@gmail\.com$/i });
        user = gmailUsers.find(u => {
          const uParts = u.email.toLowerCase().split('@');
          return uParts[0].replace(/\./g, '') === normalizedUsername;
        });
      }
    }
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

    if (user.role === "admin" && req.user.email !== "parasahemanth5119640@gmail.com") {
      return fail(res, "Only the main admin is authorized to delete administrator accounts", 403);
    }

    if (user.email === "parasahemanth5119640@gmail.com") {
      return fail(res, "The main admin account cannot be deleted", 403);
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

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return fail(res, "email is required", 400);

    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return fail(res, "Email address must contain only lowercase letters", 400);
    }
    const emailParts = email.split('@');
    if (emailParts.length === 2 && emailParts[1].toLowerCase() === 'gmail.com') {
      const username = emailParts[0];
      if (username.length < 6 || username.length > 30) {
        return fail(res, "Gmail username must be between 6 and 30 characters", 400);
      }
      if (!/^[a-zA-Z0-9.]+$/.test(username)) {
        return fail(res, "Gmail username can only contain letters, numbers, and periods", 400);
      }
      if (/\.\./.test(username)) {
        return fail(res, "Gmail username cannot contain consecutive periods", 400);
      }
      if (username.startsWith('.') || username.endsWith('.')) {
        return fail(res, "Gmail username cannot start or end with a period", 400);
      }
    }

    // Find user (including Gmail dot normalization lookup)
    const normalizedEmailInput = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmailInput });
    if (!user) {
      const emailParts = normalizedEmailInput.split('@');
      if (emailParts.length === 2 && emailParts[1] === 'gmail.com') {
        const normalizedUsername = emailParts[0].replace(/\./g, '');
        const gmailUsers = await User.find({ email: /@gmail\.com$/i });
        user = gmailUsers.find(u => {
          const uParts = u.email.toLowerCase().split('@');
          return uParts[0].replace(/\./g, '') === normalizedUsername;
        });
      }
    }
    if (!user) {
      return ok(res, null, "If that email exists in our system, an OTP has been generated.");
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otpCode;
    user.resetPasswordExpires = Date.now() + 600000; // 10 minutes
    await user.save();

    // Call notification-service internally to trigger notification/recovery link simulation
    try {
      const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:4007";
      await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications`, {
        userId: user._id,
        type: "RESET_PASSWORD_OTP",
        title: "Your Security OTP Code",
        message: `Your Docketwise verification OTP is: ${otpCode}. It is valid for 10 minutes.`,
        email: user.email,
        meta: { otp: otpCode }
      }, { timeout: 5000 });
    } catch (err) {
      console.error(`Failed to send password recovery notification:`, err.message);
    }

    // Record audit trail
    await recordAudit({
      userId: user._id,
      ip: req.ip,
      device: req.headers["user-agent"],
      action: "FORGOT_PASSWORD_REQUEST",
      status: "SUCCESS"
    });

    return ok(res, { otp: otpCode }, "Password recovery OTP generated successfully.");
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return fail(res, "email, otp and newPassword are required", 400);
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return fail(res, "Invalid or expired password reset OTP", 400);
    }

    // Save hashed new password
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Record audit trail
    await recordAudit({
      userId: user._id,
      ip: req.ip,
      device: req.headers["user-agent"],
      action: "PASSWORD_RESET",
      status: "SUCCESS"
    });

    return ok(res, null, "Password reset successfully. You can now login with your new password.");
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Admin: Create a new admin (Only main admin allowed)
exports.adminCreateAdmin = async (req, res) => {
  try {
    if (req.user.email !== "parasahemanth5119640@gmail.com") {
      return fail(res, "Only the main admin is authorized to create administrator accounts", 403);
    }

    const { name, email, password, country } = req.body;
    if (!name || !email || !password) return fail(res, "name, email and password are required", 400);

    // Email format validation
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return fail(res, "Email address must contain only lowercase letters", 400);
    }
    const emailParts = email.split('@');
    if (emailParts.length === 2 && emailParts[1].toLowerCase() === 'gmail.com') {
      const username = emailParts[0];
      if (username.length < 6 || username.length > 30) {
        return fail(res, "Gmail username must be between 6 and 30 characters", 400);
      }
      if (!/^[a-zA-Z0-9.]+$/.test(username)) {
        return fail(res, "Gmail username can only contain letters, numbers, and periods", 400);
      }
      if (/\.\./.test(username)) {
        return fail(res, "Gmail username cannot contain consecutive periods", 400);
      }
      if (username.startsWith('.') || username.endsWith('.')) {
        return fail(res, "Gmail username cannot start or end with a period", 400);
      }
    }

    // Name validation
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return fail(res, "Name must be between 2 and 50 characters", 400);
    }
    const nameRegex = /^[a-zA-Z]+[0-9]*$/;
    if (!nameRegex.test(trimmedName)) {
      return fail(res, "Name must contain only letters, optionally followed by numbers (e.g., Hemanth or Hemanth1234)", 400);
    }

    // Check if the name already exists
    const nameConflict = await User.findOne({
      name: { $regex: new RegExp("^" + trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$", "i") }
    });
    if (nameConflict) {
      return fail(res, "This name is already taken. Please choose a different name.", 400);
    }

    // Check if the email already exists
    const normalizedEmailInput = email.toLowerCase().trim();
    let existing = await User.findOne({ email: normalizedEmailInput });
    if (!existing) {
      const emailParts = normalizedEmailInput.split('@');
      if (emailParts.length === 2 && emailParts[1] === 'gmail.com') {
        const normalizedUsername = emailParts[0].replace(/\./g, '');
        const gmailUsers = await User.find({ email: /@gmail\.com$/i });
        existing = gmailUsers.find(u => {
          const uParts = u.email.toLowerCase().split('@');
          return uParts[0].replace(/\./g, '') === normalizedUsername;
        });
      }
    }
    if (existing) return fail(res, "An account with this email already exists", 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const newAdmin = await User.create({
      name,
      email,
      passwordHash,
      country: country || "IN",
      role: "admin"
    });

    await recordAudit({
      userId: req.user.id,
      ip: req.ip,
      device: req.headers["user-agent"],
      action: "ADMIN_CREATE_ADMIN",
      status: "SUCCESS",
      meta: { createdAdminId: newAdmin._id }
    });

    return ok(res, { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role }, "Admin account created successfully", 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};
