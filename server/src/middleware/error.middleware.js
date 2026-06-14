// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
};

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
