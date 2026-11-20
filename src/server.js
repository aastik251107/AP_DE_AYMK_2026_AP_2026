// ============================================================================
// 🖥️ HTTP SERVER ENTRYPOINT (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/server.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "NodeJS Event Loop, Libuv, Process Module, Servers, HTTP Protocol"
//
// 💡 WHAT THIS FILE DOES:
// 1. Creates an HTTP server wrapping our Express application.
// 2. Starts listening on the configured PORT (default: 5000).
// 3. Implements graceful shutdown using Node's native `process` module so that
//    Ctrl+C cleanly closes database connections without corrupting data!
// ============================================================================

const http = require('http');
const app = require('./app');
const config = require('./config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create the Node.js native HTTP server wrapping Express
const server = http.createServer(app);

const PORT = config.port;

// ----------------------------------------------------------------------------
// START LISTENING (NON-BLOCKING I/O EVENT LOOP)
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// GRACEFUL SHUTDOWN HANDLING (NODE.JS PROCESS MODULE)
// ----------------------------------------------------------------------------
// 💡 WHY GRACEFUL SHUTDOWN?
// If an officer is in the middle of executing a payment when someone terminates
// the server (Ctrl+C), abruptly killing the process could leave database records
// half-written or corrupted.
// "Graceful Shutdown" stops accepting new requests, finishes ongoing requests,
// closes the database pool, and exits cleanly!
const handleShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down HTTP server...`);
  server.close(async () => {
    console.log('🔒 Closed active HTTP connections.');
    await prisma.$disconnect();
    console.log('🗄️ Safely disconnected Prisma database client.');
    process.exit(0);
  });
};

// Listen for termination signals from the Operating System
process.on('SIGINT', () => handleShutdown('SIGINT'));   // Triggered by Ctrl+C in terminal
process.on('SIGTERM', () => handleShutdown('SIGTERM')); // Triggered by cloud platforms (Docker, Heroku, etc.)

// Catch unhandled Promise rejections to prevent silent node process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection at:', promise, 'reason:', reason);
});
