// Thin wrapper around amqplib used only for the AI-analysis pipeline (queue-based).
// Every other inter-service call in the platform goes over REST.
const amqp = require("amqplib");

const AI_ANALYSIS_QUEUE = "ai_analysis_queue";
const AI_RESULT_QUEUE = "ai_result_queue";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

let channelPromise = null;

async function connectWithRetry(retries = 0) {
  try {
    const url = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
    const conn = await amqp.connect(url);

    // Reset on connection error/close so the next call triggers a fresh reconnect
    conn.on("error", (err) => {
      console.error("[rabbitmq] Connection error:", err.message);
      channelPromise = null;
    });
    conn.on("close", () => {
      console.warn("[rabbitmq] Connection closed — will reconnect on next request");
      channelPromise = null;
    });

    const channel = await conn.createChannel();
    await channel.assertQueue(AI_ANALYSIS_QUEUE, { durable: true });
    await channel.assertQueue(AI_RESULT_QUEUE, { durable: true });
    console.log("[rabbitmq] Connected and queues asserted");
    return channel;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, Math.min(retries, 4)); // cap at ~48s
      console.warn(`[rabbitmq] Connection attempt ${retries + 1} failed (${err.message}). Retrying in ${delay}ms…`);
      await new Promise((r) => setTimeout(r, delay));
      return connectWithRetry(retries + 1);
    }
    throw new Error(`[rabbitmq] Could not connect after ${MAX_RETRIES} attempts: ${err.message}`);
  }
}

async function getChannel() {
  if (!channelPromise) {
    channelPromise = connectWithRetry().catch((err) => {
      // Ensure a failed promise doesn't stay cached
      channelPromise = null;
      throw err;
    });
  }
  return channelPromise;
}

async function publish(queue, message) {
  const channel = await getChannel();
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
}

async function consume(queue, handler) {
  const channel = await getChannel();
  await channel.prefetch(1);
  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload);
      channel.ack(msg);
    } catch (err) {
      console.error(`Error processing message from ${queue}:`, err.message);
      channel.nack(msg, false, false);
    }
  });
}

module.exports = { publish, consume, AI_ANALYSIS_QUEUE, AI_RESULT_QUEUE };
