// Standardized JSON response envelope used by every service
function ok(res, data, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data });
}
function fail(res, message = "Something went wrong", status = 500, errors = null) {
  return res.status(status).json({ success: false, message, errors });
}
module.exports = { ok, fail };
