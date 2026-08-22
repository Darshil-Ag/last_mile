/**
 * Central error handler — must be registered last in Express.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Known application errors thrown with a status code
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  }

  res.status(status).json({
    error: message,
    ...(isDev && status >= 500 ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
