const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const chatRoutes = require("./routes/chatRoutes");
const errorHandler = require("/app/shared/errorHandler");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.get("/health", (req, res) => res.json({ success: true, message: "chat-service healthy" }));
app.use(chatRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4005;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("chat-service connected to MongoDB");
    app.listen(PORT, () => console.log(`chat-service listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
