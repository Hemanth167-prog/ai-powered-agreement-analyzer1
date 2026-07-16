const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const errorHandler = require("/app/shared/errorHandler");
const { startConsumer } = require("./consumer");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.get("/health", (req, res) => res.json({ success: true, message: "ai-service healthy" }));
app.use(aiRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4003;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("ai-service connected to MongoDB");
    app.listen(PORT, () => console.log(`ai-service listening on port ${PORT}`));
    startConsumer();
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
