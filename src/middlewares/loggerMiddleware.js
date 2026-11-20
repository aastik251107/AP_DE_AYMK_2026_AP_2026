/**
 * Custom Logger Middleware
 * Logs incoming HTTP method, URL, headers, and calculates request execution time.
 */
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  // Hook into response finish event to measure duration
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';

    console.log(
      `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusColor}${statusCode}${resetColor} - ${duration}ms (${ip})`
    );
  });

  next();
};

module.exports = loggerMiddleware;
