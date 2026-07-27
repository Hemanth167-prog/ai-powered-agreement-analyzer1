const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Contract = require("../models/Contract");
const { ok, fail } = require("/app/shared/response");
const { recordAudit, notifyUser } = require("/app/shared/audit");
const { publish, AI_ANALYSIS_QUEUE } = require("/app/shared/rabbitmq");

// Extracts text from the uploaded file. Falls back to OCR-ready plain read for non-PDF files.
async function extractText(filePath, mimeType) {
  if (mimeType === "application/pdf") {
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  // .txt / .docx-as-text fallback; a real OCR step (e.g. Tesseract) would slot in here for images/scans
  return fs.readFileSync(filePath, "utf-8").toString();
}

exports.uploadContract = async (req, res) => {
  try {
    if (!req.file) return fail(res, "A contract file is required", 400);
    const { userCountry, employerCountry, clientCountry, contractType } = req.body;
    if (!userCountry || !employerCountry) {
      return fail(res, "userCountry and employerCountry are required", 400);
    }

    let extractedText = "";
    let imagePayload = null;

    if (req.file.mimetype.startsWith("image/")) {
      const buffer = fs.readFileSync(req.file.path);
      imagePayload = {
        mimeType: req.file.mimetype,
        data: buffer.toString("base64"),
      };
      extractedText = "[Scanned Image Contract]";
    } else {
      extractedText = await extractText(req.file.path, req.file.mimetype).catch(() => "");
    }

    const contract = await Contract.create({
      owner: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      extractedText,
      userCountry,
      employerCountry,
      clientCountry,
      contractType: contractType || "standard",
      status: "PROCESSING",
    });

    // Hand off to the AI pipeline asynchronously via the queue - including the image payload if present.
    try {
      await publish(AI_ANALYSIS_QUEUE, {
        contractId: contract._id.toString(),
        ownerId: contract.owner.toString(),
        text: extractedText,
        image: imagePayload,
        userCountry,
        employerCountry,
        clientCountry,
        contractType: contract.contractType,
      });
    } catch (queueErr) {
      console.warn("[contract-service] RabbitMQ publish failed, skipping queue dispatch:", queueErr.message);
    }

    await recordAudit({
      userId: req.user.id,
      ip: req.ip,
      device: req.headers["user-agent"],
      action: "UPLOAD_CONTRACT",
      status: "SUCCESS",
      meta: { contractId: contract._id },
    });

    return ok(res, contract, "Contract uploaded, analysis queued", 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.listContracts = async (req, res) => {
  let query = { owner: req.user.id, isDeleted: { $ne: true } };
  if (req.user.role === "admin" && req.query.ownerId) {
    query = { owner: req.query.ownerId }; // Admin can see user's entire history including deleted ones!
  }
  const contracts = await Contract.find(query).sort({ createdAt: -1 });
  return ok(res, contracts);
};

exports.getContract = async (req, res) => {
  try {
    let query = { _id: req.params.id, owner: req.user.id, isDeleted: { $ne: true } };
    if (req.user.role === "admin") {
      query = { _id: req.params.id }; // Admin can view it even if soft-deleted
    }
    const contract = await Contract.findOne(query);
    if (!contract) return fail(res, "Contract not found", 404);
    return ok(res, contract);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { isDeleted: true },
      { new: true }
    );
    if (!contract) return fail(res, "Contract not found", 404);

    await recordAudit({
      userId: req.user.id,
      ip: req.ip,
      device: req.headers["user-agent"],
      action: "DELETE_CONTRACT",
      status: "SUCCESS",
      meta: { contractId: contract._id },
    });

    return ok(res, null, "Contract deleted");
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Called internally (service-to-service REST) by ai-service once analysis finishes,
// so the contract record always stays linked to its analysis - no orphan records.
exports.linkAnalysis = async (req, res) => {
  try {
    const { contractId, aiAnalysisId } = req.body;
    const contract = await Contract.findByIdAndUpdate(
      contractId,
      { aiAnalysisId, status: "ANALYZED" },
      { new: true }
    );
    if (!contract) return fail(res, "Contract not found", 404);

    await notifyUser({
      userId: contract.owner,
      type: "AI_ANALYSIS_COMPLETED",
      title: "Contract analysis complete",
      message: `Your contract "${contract.fileName}" has finished AI analysis.`,
      meta: { contractId: contract._id },
    });

    return ok(res, contract);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.linkRiskReport = async (req, res) => {
  try {
    const { contractId, riskReportId } = req.body;
    const contract = await Contract.findByIdAndUpdate(contractId, { riskReportId }, { new: true });
    if (!contract) return fail(res, "Contract not found", 404);
    return ok(res, contract);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.linkComplianceReport = async (req, res) => {
  try {
    const { contractId, complianceReportId } = req.body;
    const contract = await Contract.findByIdAndUpdate(contractId, { complianceReportId }, { new: true });
    if (!contract) return fail(res, "Contract not found", 404);
    return ok(res, contract);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Internal endpoint to delete all contracts of a user (called during user purge by admin)
exports.deleteUserContractsInternal = async (req, res) => {
  try {
    const { userId } = req.params;
    const contracts = await Contract.find({ owner: userId });
    const db = mongoose.connection.db;

    for (const contract of contracts) {
      if (contract.filePath && fs.existsSync(contract.filePath)) {
        try {
          fs.unlinkSync(contract.filePath);
        } catch (err) {
          console.error(`Failed to delete contract file ${contract.filePath}:`, err.message);
        }
      }
      
      // Clean up child documents for this contract
      await db.collection("ai_analysis").deleteMany({ contract: contract._id });
      await db.collection("risk_reports").deleteMany({ contract: contract._id });
      await db.collection("compliance_report").deleteMany({ contract: contract._id });
      await db.collection("chatmessages").deleteMany({ contract: contract._id });
    }
    await Contract.deleteMany({ owner: userId });
    return ok(res, null, "User contracts deleted");
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

// Internal endpoint to retrieve contract data without JWT (called by internal service-to-service communication)
exports.getContractInternal = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return fail(res, "Contract not found", 404);
    return ok(res, contract);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};
