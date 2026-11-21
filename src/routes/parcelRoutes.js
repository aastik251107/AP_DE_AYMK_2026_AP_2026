// Defines parcel and ownership API routes.

const express = require('express');
const {
  createParcel,
  getParcels,
  getMyParcels,
  getParcelById,
  assignOwnerShare,
  registerOwner,
  getOwnersList
} = require('../controllers/parcelController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/owners/list', authenticate, authorize('ADMIN'), getOwnersList);
router.get('/mine', authenticate, authorize('OWNER'), getMyParcels);
router.get('/', authenticate, authorize('ADMIN'), getParcels);
router.get('/:id', authenticate, getParcelById);

router.post('/', authenticate, authorize('ADMIN'), createParcel);
router.post('/owners/register', authenticate, authorize('ADMIN'), registerOwner);
router.post('/:id/owners', authenticate, authorize('ADMIN'), assignOwnerShare);

module.exports = router;
