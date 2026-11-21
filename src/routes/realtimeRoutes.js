// Defines real-time event routes.

const express = require('express');
const { streamRealtimeEvents } = require('../controllers/realtimeController');

const router = express.Router();
router.get('/stream', streamRealtimeEvents);

module.exports = router;
