// Defines acquisition API routes.

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
router.get('/', authenticate, getAcquisitions);
router.get('/:id', authenticate, getAcquisitionById);
router.post('/', authenticate, authorize('ADMIN'), createAcquisition);
router.patch('/:id/status', authenticate, authorize('ADMIN'), updateStatus);

module.exports = router;
