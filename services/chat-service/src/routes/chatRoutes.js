const router = require("express").Router();
const controller = require("../controllers/chatController");
const { verifyJWT } = require("/app/shared/auth");

router.post("/api/chat", verifyJWT, controller.sendMessage);
router.get("/api/chat/:contractId", verifyJWT, controller.getHistory);

module.exports = router;
