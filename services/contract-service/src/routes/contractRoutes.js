const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const controller = require("../controllers/contractController");
const { verifyJWT } = require("/app/shared/auth");

const isDocker = fs.existsSync("/app") || process.env.DOCKER_ENV === "true";
const uploadDir = isDocker ? "/app/uploads" : path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.post("/api/contracts", verifyJWT, upload.single("file"), controller.uploadContract);
router.get("/api/contracts", verifyJWT, controller.listContracts);
router.get("/api/contracts/:id", verifyJWT, controller.getContract);
router.delete("/api/contracts/:id", verifyJWT, controller.deleteContract);

// Internal, service-to-service endpoints (called by ai-service / risk-compliance-service / auth-service)
router.get("/api/contracts/internal/:id", controller.getContractInternal);
router.delete("/api/contracts/internal/users/:userId", controller.deleteUserContractsInternal);
router.post("/api/contracts/internal/link-analysis", controller.linkAnalysis);
router.post("/api/contracts/internal/link-risk", controller.linkRiskReport);
router.post("/api/contracts/internal/link-compliance", controller.linkComplianceReport);

module.exports = router;
