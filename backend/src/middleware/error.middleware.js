
function errorHandler(error, req, res, next) {
  console.error("API error:", error.message);

  const statusCode =
    error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : error.message,
  });
}

module.exports = { errorHandler };
