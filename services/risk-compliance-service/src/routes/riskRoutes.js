const router = require("express").Router();
const controller = require("../controllers/riskController");
const { verifyJWT } = require("/app/shared/auth");

router.post("/api/risk/internal/generate", controller.generateReports); // internal, service-to-service
router.get("/api/risk/:contractId", verifyJWT, controller.getRiskReport);
router.get("/api/compliance/:contractId", verifyJWT, controller.getComplianceReport);

module.exports = router;
