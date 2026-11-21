// Streams application events to connected clients.

const eventBus = require('../services/eventBus');
const streamRealtimeEvents = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Flush headers immediately down the socket
  if (res.flushHeaders) {
    res.flushHeaders();
  }

  const initialPayload = {
    event: 'connected',
    message: 'Established Real-Time SSE Stream for Land Acquisition System',
    timestamp: new Date().toISOString()
  };
  res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

  const onDomainEvent = (eventData) => {
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  eventBus.on('system:event', onDomainEvent);

  const heartbeat = setInterval(() => {
    res.write(': keep-alive ping\n\n');
  }, 25000);

  // When a citizen closes their browser tab, the 'close' event fires.
  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.removeListener('system:event', onDomainEvent);
    console.log('🔌 [SSE Stream] Client disconnected from real-time stream.');
  });
};

module.exports = {
  streamRealtimeEvents
};
