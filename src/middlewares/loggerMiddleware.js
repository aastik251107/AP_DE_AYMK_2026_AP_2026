// Logs request method, path, status, and duration.

const loggerMiddleware = (req, res, next) => {
  // Record the start timestamp in milliseconds
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    // Calculate total round-trip duration
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    const statusColor =
      statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';

    console.log(
      `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusColor}${statusCode}${resetColor} - ${duration}ms (${ip})`
    );
  });

  next();
};

module.exports = loggerMiddleware;
