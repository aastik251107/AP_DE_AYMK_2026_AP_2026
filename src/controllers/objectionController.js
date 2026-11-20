const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const eventBus = require('../services/eventBus');

const prisma = new PrismaClient();

/**
 * File a Landowner Grievance / Objection
 * POST /api/v1/objections
 * Access: OWNER, OFFICER, ADMIN
 */
const fileObjection = async (req, res, next) => {
  try {
    const { acquisitionId, reason, ownerId } = req.body;

    if (!acquisitionId || !reason) {
      return sendError(res, 400, 'Please provide acquisitionId and objection reason.');
    }

    const acqId = Number(acquisitionId);

    // Resolve ownerId: If authenticated as OWNER, enforce their own profile ID
    let targetOwnerId;
    if (req.user.role === 'OWNER') {
      if (!req.user.ownerProfile) {
        return sendError(res, 403, 'Your account does not have a linked landowner profile.');
      }
      targetOwnerId = req.user.ownerProfile.id;
    } else {
      if (!ownerId) {
        return sendError(res, 400, 'Staff must specify ownerId for filing on citizen behalf.');
      }
      targetOwnerId = Number(ownerId);
    }

    // Verify acquisition exists and get its parcel
    const acquisition = await prisma.acquisition.findUnique({
      where: { id: acqId },
      include: {
        parcel: {
          include: { parcelOwners: true }
        },
        project: true
      }
    });

    if (!acquisition) {
      return sendError(res, 404, `Acquisition #${acqId} not found.`);
    }

    // Validate that the landowner actually owns part of this parcel
    const isOwnerOfParcel = acquisition.parcel.parcelOwners.some((po) => po.ownerId === targetOwnerId);
    if (!isOwnerOfParcel) {
      return sendError(
        res,
        403,
        `Landowner #${targetOwnerId} does not hold an ownership share in Parcel #${acquisition.parcelId} (${acquisition.parcel.surveyNumber}). Cannot file objection.`
      );
    }

    // Create objection
    const objection = await prisma.objection.create({
      data: {
        acquisitionId: acqId,
        ownerId: targetOwnerId,
        reason,
        status: 'OPEN'
      },
      include: {
        owner: true,
        acquisition: {
          include: { parcel: true, project: true }
        }
      }
    });

    // Emit Real-Time Domain Event
    eventBus.emitEvent('objection:filed', {
      objectionId: objection.id,
      acquisitionId: acqId,
      surveyNumber: acquisition.parcel.surveyNumber,
      projectName: acquisition.project.name,
      ownerName: objection.owner.fullName,
      reason,
      filedAt: objection.filedAt
    });

    return sendSuccess(res, 201, 'Objection filed successfully. Status: OPEN', objection);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Objections with Filtering
 * GET /api/v1/objections
 * Query params: status (OPEN, UNDER_REVIEW, RESOLVED, REJECTED), acquisitionId
 */
const getObjections = async (req, res, next) => {
  try {
    const { status, acquisitionId } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (acquisitionId) {
      where.acquisitionId = Number(acquisitionId);
    }

    // If citizen OWNER, only return their own objections
    if (req.user.role === 'OWNER' && req.user.ownerProfile) {
      where.ownerId = req.user.ownerProfile.id;
    }

    const objections = await prisma.objection.findMany({
      where,
      include: {
        owner: true,
        acquisition: {
          include: { parcel: true, project: true }
        }
      },
      orderBy: { filedAt: 'desc' }
    });

    return sendSuccess(res, 200, 'Objections retrieved', objections);
  } catch (error) {
    next(error);
  }
};

/**
 * Review / Resolve Objection
 * PATCH /api/v1/objections/:id/status
 * Access: ADMIN, OFFICER
 */
const updateObjectionStatus = async (req, res, next) => {
  try {
    const objectionId = Number(req.params.id);
    const { status, resolutionNotes } = req.body;

    const validStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 400, `Invalid objection status. Must be one of: [${validStatuses.join(', ')}]`);
    }

    const objection = await prisma.objection.findUnique({
      where: { id: objectionId },
      include: { owner: true, acquisition: { include: { parcel: true } } }
    });

    if (!objection) {
      return sendError(res, 404, `Objection #${objectionId} not found.`);
    }

    const updateData = {
      status,
      resolvedAt: ['RESOLVED', 'REJECTED'].includes(status) ? new Date() : null
    };

    const updated = await prisma.objection.update({
      where: { id: objectionId },
      data: updateData,
      include: { owner: true, acquisition: true }
    });

    // Emit Real-Time Domain Event
    eventBus.emitEvent('objection:resolved', {
      objectionId,
      acquisitionId: updated.acquisitionId,
      surveyNumber: objection.acquisition.parcel.surveyNumber,
      ownerName: objection.owner.fullName,
      newStatus: status,
      resolvedBy: req.user.name,
      resolutionNotes: resolutionNotes || 'Status updated by officer'
    });

    return sendSuccess(res, 200, `Objection status updated to '${status}'`, updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  fileObjection,
  getObjections,
  updateObjectionStatus
};
