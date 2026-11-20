const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const projectRoutes = require('./projectRoutes');
const parcelRoutes = require('./parcelRoutes');
const acquisitionRoutes = require('./acquisitionRoutes');
const compensationRoutes = require('./compensationRoutes');
const objectionRoutes = require('./objectionRoutes');
const realtimeRoutes = require('./realtimeRoutes');

const router = express.Router();

/**
 * API Versioning: /api/v1
 * Resource Based URLs
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/parcels', parcelRoutes);
router.use('/acquisitions', acquisitionRoutes);
router.use('/compensations', compensationRoutes);
router.use('/objections', objectionRoutes);
router.use('/realtime', realtimeRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'Real-Time Land Acquisition API v1'
  });
});

module.exports = router;
