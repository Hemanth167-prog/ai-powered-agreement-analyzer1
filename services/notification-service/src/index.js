// Local Development Bootstrapper (supports running outside Docker Compose)
const fs = require("fs");
const path = require("path");
if (process.platform === "win32" || !fs.existsSync("/app")) {
  let projectRoot = __dirname;
  while (projectRoot && !fs.existsSync(path.join(projectRoot, "shared")) && projectRoot !== path.dirname(projectRoot)) {
    projectRoot = path.dirname(projectRoot);
  }
  const Module = require("module");
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request.startsWith("/app/")) {
      request = request.replace("/app", projectRoot);
    }
    try {
      return originalResolve(request, parent, isMain, options);
    } catch (err) {
      if (err.code === "MODULE_NOT_FOUND" && !path.isAbsolute(request) && !request.startsWith(".")) {
        const serviceNodeModules = path.resolve(__dirname, "../node_modules");
        try {
          return originalResolve(path.join(serviceNodeModules, request), parent, isMain, options);
        } catch (e) {}
      }
      throw err;
    }
  };
  const envPath = path.join(projectRoot, ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8").split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
    });
  }
}

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const notificationRoutes = require("./routes/notificationRoutes");
const errorHandler = require("/app/shared/errorHandler");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.get("/health", (req, res) => res.json({ success: true, message: "notification-service healthy" }));
app.use(notificationRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4007;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("notification-service connected to MongoDB");
    app.listen(PORT, () => console.log(`notification-service listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
