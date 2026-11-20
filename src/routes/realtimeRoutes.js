const express = require('express');
const { streamRealtimeEvents } = require('../controllers/realtimeController');

const router = express.Router();

/**
 * Real-Time Server-Sent Events (SSE) Stream
 * Base Path: /api/v1/realtime
 */
router.get('/stream', streamRealtimeEvents);

module.exports = router;
