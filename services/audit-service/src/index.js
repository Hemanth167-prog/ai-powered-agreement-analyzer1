const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const auditRoutes = require("./routes/auditRoutes");
const errorHandler = require("/app/shared/errorHandler");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.get("/health", (req, res) => res.json({ success: true, message: "audit-service healthy" }));
app.use(auditRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4008;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("audit-service connected to MongoDB");
    app.listen(PORT, () => console.log(`audit-service listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
