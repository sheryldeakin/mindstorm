/**
 * Wraps an async route handler to forward errors to next().
 * @param {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<unknown>} fn
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
