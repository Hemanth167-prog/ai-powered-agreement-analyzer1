const router = require("express").Router();
const controller = require("../controllers/notificationController");
const { verifyJWT } = require("/app/shared/auth");

router.post("/api/notifications", controller.create); // internal, service-to-service
router.get("/api/notifications", verifyJWT, controller.list);
router.patch("/api/notifications/:id/read", verifyJWT, controller.markRead);

module.exports = router;
