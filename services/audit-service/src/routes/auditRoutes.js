const router = require("express").Router();
const controller = require("../controllers/auditController");
const { verifyJWT, requireRole } = require("/app/shared/auth");

router.post("/api/audit", controller.create); // internal, service-to-service
router.get("/api/audit/me", verifyJWT, controller.myLogs);
router.get("/api/audit/all", verifyJWT, requireRole("admin"), controller.allLogs);

module.exports = router;
