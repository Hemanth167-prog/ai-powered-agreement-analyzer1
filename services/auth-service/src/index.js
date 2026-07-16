const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("/app/shared/errorHandler");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.get("/health", (req, res) => res.json({ success: true, message: "auth-service healthy" }));
app.use(authRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("auth-service connected to MongoDB");
    app.listen(PORT, () => console.log(`auth-service listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
