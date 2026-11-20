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
router.get('/', getAcquisitions);
router.get('/:id', getAcquisitionById);
router.post('/', authenticate, authorize('ADMIN', 'OFFICER'), createAcquisition);
router.patch('/:id/status', authenticate, authorize('ADMIN', 'OFFICER'), updateStatus);

module.exports = router;
