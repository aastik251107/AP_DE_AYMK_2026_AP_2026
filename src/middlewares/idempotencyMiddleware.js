/**
 * Idempotency Middleware
 * 
 * Lecture Topic: "Express JS, Middlewares in Express, Idempotency"
 * 
 * In financial transactions (like government land compensation payouts) and critical workflow actions,
 * network hiccups or user double-clicks could cause duplicate POST requests.
 * 
 * Clients provide an 'Idempotency-Key: <unique-uuid>' header.
 * - If the key is new: The response is cached upon completion.
 * - If the key was already processed: The cached response is returned immediately with HTTP header 'X-Cache-Lookup: HIT',
 *   preventing duplicate bank disbursements or duplicate database records!
 */

const idempotencyStore = new Map();

// Automatically purge expired idempotency keys (TTL: 1 hour)
const CACHE_TTL_MS = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 10 * 60 * 1000); // Clean every 10 minutes

const idempotency = (req, res, next) => {
  // Only enforce or inspect idempotency keys on mutating HTTP methods
  if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];

  // If client didn't provide an Idempotency-Key, proceed normally
  if (!idempotencyKey) {
    return next();
  }

  // Check if we have seen this key before
  const cached = idempotencyStore.get(idempotencyKey);
  if (cached) {
    console.log(`🔁 [Idempotency HIT] Replaying cached response for key: ${idempotencyKey}`);
    res.setHeader('X-Cache-Lookup', 'HIT');
    res.setHeader('X-Idempotency-Key', idempotencyKey);
    return res.status(cached.statusCode).json(cached.body);
  }

  // Intercept res.json to capture the response and store it against this key
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Only cache successful or client-validation responses (not server 500 errors)
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
