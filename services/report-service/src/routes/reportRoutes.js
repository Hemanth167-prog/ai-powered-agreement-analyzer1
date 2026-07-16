const router = require("express").Router();
const controller = require("../controllers/reportController");
const { verifyJWT } = require("/app/shared/auth");

router.get("/api/reports/contract/:contractId", verifyJWT, controller.buildContractReport);
router.get("/api/reports/activity", verifyJWT, controller.buildUserActivityReport);

module.exports = router;
