const eventBus = require('../services/eventBus');

/**
 * Real-Time Server-Sent Events (SSE) Stream Controller
 * 
 * Lecture Topics Covered:
 * - NodeJS Event Loop, Libuv & Non-blocking I/O
 * - Node.js Streams & Persistent HTTP Connections
 * - EventEmitter, Event-Driven Programming & Observer Pattern
 * 
 * GET /api/v1/realtime/stream
 */
const streamRealtimeEvents = (req, res) => {
  // 1. Establish Server-Sent Events (SSE) HTTP Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Flush headers immediately
  if (res.flushHeaders) {
    res.flushHeaders();
  }

  // 2. Send initial handshake connection message
  const initialPayload = {
    event: 'connected',
    message: 'Established Real-Time SSE Stream for Land Acquisition System',
    timestamp: new Date().toISOString()
  };
  res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

  // 3. Observer Pattern: Register listener on the EventBus singleton
  const onDomainEvent = (eventData) => {
    // Format according to the W3C SSE standard: "data: {...}\n\n"
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  eventBus.on('system:event', onDomainEvent);

  // 4. Periodic heartbeat (keep-alive comment ping every 25 seconds)
  const heartbeat = setInterval(() => {
    res.write(': keep-alive ping\n\n');
  }, 25000);

  // 5. Cleanup on client disconnect (prevent memory leaks)
  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.removeListener('system:event', onDomainEvent);
    console.log('🔌 [SSE Stream] Client disconnected from real-time stream.');
  });
};

module.exports = {
  streamRealtimeEvents
};
