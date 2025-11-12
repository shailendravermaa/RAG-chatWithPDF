// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Log error for debugging with timestamp and request info
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error occurred:`);
  console.error('Method:', req.method);
  console.error('Path:', req.path);
  console.error('Message:', err.message);
  console.error('Status:', err.statusCode || 500);
  console.error('Code:', err.code || 'INTERNAL_ERROR');
  
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
  }

  // Default error status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Consistent error response format
  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      path: req.path,
      method: req.method
    })
  });
};

// Custom error class for application errors
export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 Not Found handler
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};
