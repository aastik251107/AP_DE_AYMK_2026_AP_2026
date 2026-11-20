const http = require('http');
const app = require('./app');
const config = require('./config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const server = http.createServer(app);

const PORT = config.port;

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

// Graceful Shutdown handling (Process Module)
const handleShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down HTTP server...`);
  server.close(async () => {
    console.log('🔒 Closed active HTTP connections.');
    await prisma.$disconnect();
    console.log('🗄️ Disconnected Prisma database client.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection at:', promise, 'reason:', reason);
});
