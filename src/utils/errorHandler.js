/**
 * Error handling utility for async/await functions in Express
 * Eliminates the need for try/catch blocks in controllers
 * @param {Function} fn - Async controller function to wrap
 * @returns {Function} - Express middleware function with error handling
 */
exports.catchAsync = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
  
  /**
   * Custom error class for API errors
   */
  class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  exports.AppError = AppError;