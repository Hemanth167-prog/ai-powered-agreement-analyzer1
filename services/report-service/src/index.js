const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const reportRoutes = require("./routes/reportRoutes");
const errorHandler = require("/app/shared/errorHandler");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.get("/health", (req, res) => res.json({ success: true, message: "report-service healthy" }));
app.use(reportRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4006;
app.listen(PORT, () => console.log(`report-service listening on port ${PORT}`));
// report-service is stateless (no MongoDB of its own) - it aggregates data from other services
