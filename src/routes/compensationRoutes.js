const express = require('express');
const { getCompensations, disbursePayment } = require('../controllers/compensationController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const idempotency = require('../middlewares/idempotencyMiddleware');

const router = express.Router();

/**
 * Compensation Ledger & Disbursement Endpoints
 * Base Path: /api/v1/compensations
 */
router.get('/', authenticate, getCompensations);
// Idempotency middleware protects the financial payment disbursement endpoint!
router.post('/:id/pay', authenticate, authorize('ADMIN'), idempotency, disbursePayment);

module.exports = router;
