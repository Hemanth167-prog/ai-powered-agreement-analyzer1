// Central error handler: never leak stack traces, always return a friendly JSON error.
function errorHandler(err, req, res, next) {
  // Mongoose CastError or BSONError from an invalid ObjectId in the URL (e.g. /contracts/1)
  const isCastError =
    err.name === "CastError" ||
    err.name === "BSONError" ||
    (err.reason && err.reason.name === "BSONError");

  if (isCastError) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format.",
      errors: null,
    });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error. Please try again later." : err.message,
    errors: null,
  });
}

// Prevent any unhandled promise rejection or uncaught exception from killing the process.
// Log and continue — the express error handler deals with per-request errors.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err.message);
});

module.exports = errorHandler;
