/**
 * Express middleware for 404 routes.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {void}
 */
const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

/**
 * Express error handler middleware.
 * @param {Error & { status?: number }} err
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 * @returns {void}
 */
const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Unexpected server error";
  console.error(err);
  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
