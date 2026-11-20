// ============================================================================
// ⚡ SERVER-SENT EVENTS (SSE) REAL-TIME CONTROLLER (BEGINNER-FRIENDLY 🚀)
// File: src/controllers/realtimeController.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "Streams, NodeJS Event Loop, Libuv / async programming, Non-blocking I/O"
// "EventEmitter, Event-Driven Programming, Observer Pattern"
//
// 💡 WHAT IS SERVER-SENT EVENTS (SSE)? (THE "RADIO BROADCAST" ANALOGY):
// In traditional HTTP requests, the browser asks a question and the server answers
// once, then closes the connection immediately.
//
// With SSE (Server-Sent Events):
// 1. The client browser opens a connection to `GET /api/v1/realtime/stream`.
// 2. The server keeps this HTTP connection OPEN INDEFINITELY!
// 3. Whenever something happens in the backend (a workflow status changes, or a payout
//    is made), the server immediately pushes a chunk of text down this open stream!
// 4. The browser receives it in milliseconds without refreshing the page!
//
// 💡 WHY SSE INSTEAD OF POLLING?
// - Polling = Calling your friend every 2 seconds asking "Are you here yet?".
// - SSE = Your friend calls you the second they arrive at the doorstep.
// ============================================================================

const eventBus = require('../services/eventBus');

/**
 * Real-Time Stream Endpoint
 * GET /api/v1/realtime/stream
 */
const streamRealtimeEvents = (req, res) => {
  // --------------------------------------------------------------------------
  // STEP 1: SET SPECIAL SSE HTTP HEADERS
  // --------------------------------------------------------------------------
  // - text/event-stream: Tells the browser this is an ongoing stream, not a static page.
  // - Cache-Control: no-cache: Prevents proxies/browsers from buffering or caching chunks.
  // - Connection: keep-alive: Keeps the TCP connection open indefinitely.
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

  // --------------------------------------------------------------------------
  // STEP 2: SEND INITIAL HANDSHAKE WELCOME MESSAGE
  // --------------------------------------------------------------------------
  // 💡 W3C SSE PROTOCOL FORMAT:
  // Every message MUST begin with "data: " and end with TWO newlines "\n\n"!
  const initialPayload = {
    event: 'connected',
    message: 'Established Real-Time SSE Stream for Land Acquisition System',
    timestamp: new Date().toISOString()
  };
  res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

  // --------------------------------------------------------------------------
  // STEP 3: OBSERVER PATTERN LISTENER (REGISTER ON EVENTBUS)
  // --------------------------------------------------------------------------
  // Whenever the EventBus emits 'system:event', this listener writes it to the HTTP stream!
  const onDomainEvent = (eventData) => {
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  eventBus.on('system:event', onDomainEvent);

  // --------------------------------------------------------------------------
  // STEP 4: KEEP-ALIVE HEARTBEAT PING (PREVENTS TIMEOUTS)
  // --------------------------------------------------------------------------
  // Some cloud firewalls or routers kill idle connections after 60 seconds.
  // We send a lightweight comment ping `: keep-alive` every 25 seconds to keep it fresh.
  const heartbeat = setInterval(() => {
    res.write(': keep-alive ping\n\n');
  }, 25000);

  // --------------------------------------------------------------------------
  // STEP 5: PREVENT MEMORY LEAKS ON CLIENT DISCONNECT
  // --------------------------------------------------------------------------
  // When a citizen closes their browser tab, the 'close' event fires.
  // We MUST remove the listener from EventBus, otherwise thousands of disconnected
  // listeners would build up in RAM and crash the server!
  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.removeListener('system:event', onDomainEvent);
    console.log('🔌 [SSE Stream] Client disconnected from real-time stream.');
  });
};

module.exports = {
  streamRealtimeEvents
};
