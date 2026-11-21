// Prevents duplicate processing of keyed requests.

const idempotencyStore = new Map();

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
  if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
    return next();
  }

  // Read the custom header: 'Idempotency-Key: <unique-uuid>'
  const idempotencyKey = req.headers['idempotency-key'];

  // If the client did not send an Idempotency-Key, let the request proceed normally
  if (!idempotencyKey) {
    return next();
  }

  const cached = idempotencyStore.get(idempotencyKey);
  if (cached) {
    console.log(`🔁 [Idempotency HIT] Replaying cached response for key: ${idempotencyKey}`);
    res.setHeader('X-Cache-Lookup', 'HIT');
    res.setHeader('X-Idempotency-Key', idempotencyKey);
    return res.status(cached.statusCode).json(cached.body);
  }

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
