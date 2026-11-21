// ============================================================================
// 🔁 IDEMPOTENCY MIDDLEWARE (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/middlewares/idempotencyMiddleware.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "Express JS, Middlewares in Express, Idempotency"
//
// 💡 WHAT IS IDEMPOTENCY? (THE "ELEVATOR BUTTON" ANALOGY):
// Imagine you are waiting for an elevator:
// - You press the "UP" button once. The light turns on.
// - If you impatiently mash the "UP" button 10 more times, does the building
//   send you 10 separate elevators? NO! The elevator system is "IDEMPOTENT".
//   Calling it 10 times produces the exact same result as calling it once.
//
// 💡 WHY IS IDEMPOTENCY VITAL IN LAND ACQUISITION & MONEY TRANSFERS?
// In our project, an Admin clicks: "Disburse ₹30,00,000 Compensation to Suresh Reddy".
// Suppose the admin's internet connection freezes for 2 seconds.
// The admin gets nervous and clicks the "Pay ₹30 Lakh" button 3 times!
// - WITHOUT IDEMPOTENCY: The server executes 3 separate POST requests and accidentally
//   deducts ₹90 Lakh from the government treasury! 😱
// - WITH IDEMPOTENCY: The frontend passes an `Idempotency-Key: tx_12345` header.
//   1st click: Server processes payment, saves result, and returns 'X-Cache-Lookup: MISS'.
//   2nd & 3rd click: Server recognizes `tx_12345`, skips database mutation, and returns
//   the cached result with header 'X-Cache-Lookup: HIT'! Safe and protected! 🛡️
// ============================================================================

// In-memory key-value cache: Map(idempotencyKey -> { statusCode, body, createdAt })
const idempotencyStore = new Map();

// Automatically purge old idempotency keys after 1 hour (TTL: Time To Live)
const CACHE_TTL_MS = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 10 * 60 * 1000); // Garbage collection run every 10 minutes

const idempotency = (req, res, next) => {
  // Only mutating HTTP methods (POST, PATCH, PUT) need idempotency protection.
  // GET and DELETE are naturally idempotent according to HTTP specs.
  if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
    return next();
  }

  // Read the custom header: 'Idempotency-Key: <unique-uuid>'
  const idempotencyKey = req.headers['idempotency-key'];

  // If the client did not send an Idempotency-Key, let the request proceed normally
  if (!idempotencyKey) {
    return next();
  }

  // CASE 1: KEY SEEN BEFORE (CACHE HIT)
  const cached = idempotencyStore.get(idempotencyKey);
  if (cached) {
    console.log(`🔁 [Idempotency HIT] Replaying cached response for key: ${idempotencyKey}`);
    res.setHeader('X-Cache-Lookup', 'HIT');
    res.setHeader('X-Idempotency-Key', idempotencyKey);
    return res.status(cached.statusCode).json(cached.body);
  }

  // CASE 2: FIRST TIME SEEING THIS KEY (CACHE MISS)
  // Intercept Express's res.json() method to capture the outgoing response payload
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Only cache successful or client validation responses (not server 500 crashes)
    if (res.statusCode < 500) {
      idempotencyStore.set(idempotencyKey, {
        statusCode: res.statusCode,
        body,
        createdAt: Date.now()
      });
    }

    res.setHeader('X-Cache-Lookup', 'MISS');
    res.setHeader('X-Idempotency-Key', idempotencyKey);
    return originalJson(body);
  };

  next();
};

module.exports = idempotency;
