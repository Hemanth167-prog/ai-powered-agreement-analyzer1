const axios = require("axios");
const ChatMessage = require("../models/ChatMessage");
const { ok, fail } = require("/app/shared/response");
const { recordAudit } = require("/app/shared/audit");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://ai-service:4003";

exports.sendMessage = async (req, res) => {
  try {
    const { contractId, message } = req.body;
    if (!contractId || !message) return fail(res, "contractId and message are required", 400);

    const userMsg = await ChatMessage.create({ contract: contractId, owner: req.user.id, role: "user", message });

    // Delegate the actual answer generation to ai-service over REST (chat is CRUD, not the queue).
    let assistantReply = "I'm unable to answer right now, please try again shortly.";
    try {
      const { data } = await axios.post(`${AI_SERVICE_URL}/api/ai/chat-answer`, {
        contractId,
        question: message,
      });
      assistantReply = data?.data?.answer || assistantReply;
    } catch (err) {
      console.error("ai-service chat-answer failed:", err.message);
    }

    const assistantMsg = await ChatMessage.create({
      contract: contractId,
      owner: req.user.id,
      role: "assistant",
      message: assistantReply,
    });

    await recordAudit({ userId: req.user.id, action: "CHAT_MESSAGE", status: "SUCCESS", meta: { contractId } });

    return ok(res, { userMsg, assistantMsg }, "Message sent", 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.getHistory = async (req, res) => {
  const history = await ChatMessage.find({ contract: req.params.contractId, owner: req.user.id }).sort({ createdAt: 1 });
  return ok(res, history);
};
