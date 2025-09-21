import { ErrorRequestHandler } from 'express';

/**
 * Express error handling middleware.
 * @param {any} err - The error object.
 * @param {Request} req - The express request object.
 * @param {Response} res - The express response object.
 * @param {NextFunction} _next - The next middleware function.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message || 'Internal Server Error',
  });
};
