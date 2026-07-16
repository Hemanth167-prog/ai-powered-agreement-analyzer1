const Notification = require("../models/Notification");
const { ok, fail } = require("/app/shared/response");

// Called internally by every other service (REST) whenever a process completes.
exports.create = async (req, res) => {
  try {
    const { userId, type, title, message, meta } = req.body;
    const notification = await Notification.create({ userId, type, title, message, meta });
    return ok(res, notification, "Notification created", 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.list = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100);
  return ok(res, notifications);
};

exports.markRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { isRead: true },
    { new: true }
  );
  if (!notification) return fail(res, "Notification not found", 404);
  return ok(res, notification);
};
