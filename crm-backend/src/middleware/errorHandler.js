/**
 * @desc    Error handler middleware
 * @param   {Error} err - Error object
 * @param   {Object} req - Express request object
 * @param   {Object} res - Express response object
 * @param   {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Log to console for development
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack || err);
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: message
  });
};

module.exports = errorHandler;
