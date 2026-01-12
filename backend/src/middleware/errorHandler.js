const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Unexpected server error";
  console.error(err);
  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
