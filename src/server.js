// Starts the HTTP server and handles shutdown.

const app = require('./app');
const config = require('./config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`Land Acquisition System running at http://localhost:${PORT}`);
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
