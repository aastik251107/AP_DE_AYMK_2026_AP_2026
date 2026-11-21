// Starts the HTTP server and handles shutdown.

const http = require('http');
const app = require('./app');
const config = require('./config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create the Node.js native HTTP server wrapping Express
const server = http.createServer(app);

const PORT = config.port;

// Start the HTTP server.
server.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 Land Acquisition Real-Time API Server Running!`);
  console.log(`📍 URL:          http://localhost:${PORT}`);
  console.log(`📡 Real-Time SSE: http://localhost:${PORT}/api/v1/realtime/stream`);
  console.log(`🖥️ Web Dashboard: http://localhost:${PORT}`);
  console.log(`🩺 Healthcheck:   http://localhost:${PORT}/api/v1/health`);
  console.log(`🌱 Environment:   ${config.nodeEnv}`);
  console.log(`=======================================================`);
});

// Close the server and database connection during shutdown.
const handleShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down HTTP server...`);
  server.close(async () => {
    console.log('🔒 Closed active HTTP connections.');
    await prisma.$disconnect();
    console.log('🗄️ Safely disconnected Prisma database client.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));   // Triggered by Ctrl+C in terminal
process.on('SIGTERM', () => handleShutdown('SIGTERM')); // Triggered by cloud platforms (Docker, Heroku, etc.)

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection at:', promise, 'reason:', reason);
});
