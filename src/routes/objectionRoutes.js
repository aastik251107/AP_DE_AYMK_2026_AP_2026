const express = require('express');
const {
  fileObjection,
  getObjections,
  updateObjectionStatus
} = require('../controllers/objectionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * Grievance & Dispute Redressal Endpoints
 * Base Path: /api/v1/objections
 */
router.get('/', authenticate, getObjections);
router.post('/', authenticate, fileObjection);
router.patch('/:id/status', authenticate, authorize('ADMIN', 'OFFICER'), updateObjectionStatus);

module.exports = router;
