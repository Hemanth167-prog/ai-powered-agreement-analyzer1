const router = require("express").Router();
const controller = require("../controllers/authController");
const { verifyJWT, requireRole } = require("/app/shared/auth");

router.post("/api/auth/register", controller.register);
router.post("/api/auth/login", controller.login);
router.post("/api/auth/refresh", controller.refresh);
router.post("/api/auth/forgot-password", controller.forgotPassword);
router.post("/api/auth/reset-password", controller.resetPassword);
router.post("/api/auth/logout", verifyJWT, controller.logout);
router.get("/api/auth/me", verifyJWT, controller.me);

// Heartbeat and admin user management routes
router.post("/api/auth/heartbeat", verifyJWT, controller.heartbeat);
router.get("/api/auth/admin/users", verifyJWT, requireRole("admin"), controller.adminGetUsers);
router.get("/api/auth/admin/active-count", verifyJWT, requireRole("admin"), controller.adminGetActiveCount);
router.post("/api/auth/admin/admins", verifyJWT, requireRole("admin"), controller.adminCreateAdmin);
router.delete("/api/auth/admin/users/:userId", verifyJWT, requireRole("admin"), controller.adminDeleteUser);

module.exports = router;
