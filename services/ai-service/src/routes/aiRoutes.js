const router = require("express").Router();
const controller = require("../controllers/aiController");
const { verifyJWT } = require("/app/shared/auth");

router.get("/api/ai/analysis/contract/:contractId", verifyJWT, controller.getAnalysisByContract);
router.post("/api/ai/chat-answer", controller.chatAnswer);

module.exports = router;
