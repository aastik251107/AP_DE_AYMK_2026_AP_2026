// Defines landowner query API routes.

const express = require('express');
const {
  fileObjection,
  getObjections,
  updateObjectionStatus
} = require('../controllers/objectionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();
router.get('/', authenticate, getObjections);
router.post('/', authenticate, fileObjection);
router.patch('/:id/status', authenticate, authorize('ADMIN'), updateObjectionStatus);

module.exports = router;
