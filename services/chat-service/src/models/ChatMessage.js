const mongoose = require("mongoose");

// Chat history tied to a contract, so a user can ask follow-up questions
// about a specific contract's AI analysis.
const chatMessageSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
