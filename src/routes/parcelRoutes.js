const express = require('express');
const {
  createParcel,
  getParcels,
  getParcelById,
  assignOwnerShare,
  registerOwner,
  getOwnersList
} = require('../controllers/parcelController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * Cadastral Parcels & Landowner Registry Endpoints
 * Base Path: /api/v1/parcels
 */
router.get('/', getParcels);
router.get('/owners/list', getOwnersList);
router.get('/:id', getParcelById);
router.post('/', authenticate, authorize('ADMIN', 'OFFICER'), createParcel);
router.post('/owners/register', authenticate, authorize('ADMIN', 'OFFICER'), registerOwner);
router.post('/:id/owners', authenticate, authorize('ADMIN', 'OFFICER'), assignOwnerShare);

module.exports = router;
