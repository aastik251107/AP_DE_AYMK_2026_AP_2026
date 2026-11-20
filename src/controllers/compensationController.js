const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const eventBus = require('../services/eventBus');

const prisma = new PrismaClient();

/**
 * Get Compensations with Filtering
 * GET /api/v1/compensations
 * Query params: status (PENDING, PAID), ownerId, acquisitionId
 */
const getCompensations = async (req, res, next) => {
  try {
    const { status, ownerId, acquisitionId } = req.query;

    const where = {};
    if (status) {
      where.paymentStatus = status;
    }
    if (acquisitionId) {
      where.acquisitionId = Number(acquisitionId);
    }
    if (ownerId) {
      where.ownerId = Number(ownerId);
    }

    // If citizen OWNER role, restrict to their own records
    if (req.user.role === 'OWNER' && req.user.ownerProfile) {
      where.ownerId = req.user.ownerProfile.id;
    }

    const compensations = await prisma.compensation.findMany({
      where,
      include: {
        owner: true,
        acquisition: {
          include: {
            parcel: true,
            project: true
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    return sendSuccess(res, 200, 'Compensations retrieved', compensations);
  } catch (error) {
    next(error);
  }
};

/**
 * Disburse / Pay Compensation (Idempotent Endpoint)
 * POST /api/v1/compensations/:id/pay
 * Access: ADMIN, OFFICER
 * Headers: Idempotency-Key: <unique-uuid> (optional but encouraged)
 */
const disbursePayment = async (req, res, next) => {
  try {
    const compensationId = Number(req.params.id);

    const comp = await prisma.compensation.findUnique({
      where: { id: compensationId },
      include: {
        owner: true,
        acquisition: {
          include: { parcel: true, project: true }
        }
      }
    });

    if (!comp) {
      return sendError(res, 404, `Compensation record #${compensationId} not found.`);
    }

    if (comp.paymentStatus === 'PAID') {
      return sendError(
        res,
        400,
        `Compensation #${compensationId} has already been PAID on ${comp.paymentDate}.`
      );
    }

    // Mark as PAID
    const updated = await prisma.compensation.update({
      where: { id: compensationId },
      data: {
        paymentStatus: 'PAID',
        paymentDate: new Date()
      },
      include: {
        owner: true,
        acquisition: true
      }
    });

    // Check if all compensations for this acquisition are now paid
    const remainingUnpaid = await prisma.compensation.count({
      where: {
        acquisitionId: comp.acquisitionId,
        paymentStatus: { not: 'PAID' }
      }
    });

    // If all are paid and acquisition is in VALUATED, auto-advance to COMPENSATED!
    if (remainingUnpaid === 0 && comp.acquisition.status === 'VALUATED') {
      await prisma.acquisition.update({
        where: { id: comp.acquisitionId },
        data: { status: 'COMPENSATED' }
      });

      await prisma.statusHistory.create({
        data: {
          acquisitionId: comp.acquisitionId,
          oldStatus: 'VALUATED',
          newStatus: 'COMPENSATED',
          changedById: req.user.id
        }
      });

      eventBus.emitEvent('acquisition:status_changed', {
        acquisitionId: comp.acquisitionId,
        parcelSurvey: comp.acquisition.parcel.surveyNumber,
        projectName: comp.acquisition.project.name,
        oldStatus: 'VALUATED',
        newStatus: 'COMPENSATED',
        updatedBy: req.user.name,
        reason: 'All landowner compensation vouchers disbursed'
      });
    }

    // Emit Real-Time Domain Event
    eventBus.emitEvent('compensation:paid', {
      compensationId: updated.id,
      acquisitionId: updated.acquisitionId,
      ownerName: comp.owner.fullName,
      idNumber: comp.owner.idNumber,
      amount: updated.amount,
      paymentDate: updated.paymentDate,
      disbursedBy: req.user.name
    });

    return sendSuccess(res, 200, `Compensation payment of ₹${updated.amount} disbursed successfully`, updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompensations,
  disbursePayment
};
