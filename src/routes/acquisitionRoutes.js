const express = require('express');
const {
  createAcquisition,
  getAcquisitions,
  getAcquisitionById,
  updateStatus
} = require('../controllers/acquisitionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * Land Acquisition Workflow Engine Endpoints
 * Base Path: /api/v1/acquisitions
 */
router.get('/', authenticate, getAcquisitions);
router.get('/:id', authenticate, getAcquisitionById);
router.post('/', authenticate, authorize('ADMIN'), createAcquisition);
router.patch('/:id/status', authenticate, authorize('ADMIN'), updateStatus);

module.exports = router;
