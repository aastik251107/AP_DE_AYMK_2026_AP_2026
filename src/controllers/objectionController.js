// Handles landowner query submissions and reviews.

const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const eventBus = require('../services/eventBus');

const prisma = new PrismaClient();
const fileObjection = async (req, res, next) => {
  try {
    const { acquisitionId, reason, ownerId } = req.body;

    if (!acquisitionId || !reason) {
      return sendError(res, 400, 'Please provide acquisitionId and objection reason.');
    }

    const acqId = Number(acquisitionId);

    // Determine target owner:
    // If authenticated as citizen OWNER, enforce their own profile ID
    let targetOwnerId;
    if (req.user.role === 'OWNER') {
      if (!req.user.ownerProfile) {
        return sendError(res, 403, 'Your citizen user account does not have a linked landowner profile.');
      }
      targetOwnerId = req.user.ownerProfile.id;
    } else {
      // If an Admin is filing on behalf of a citizen, require ownerId
      if (!ownerId) {
        return sendError(res, 400, 'Staff filing an objection must specify the citizen ownerId.');
      }
      targetOwnerId = Number(ownerId);
    }

    // Verify acquisition exists and load parcel co-owners
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

    // Verify that the citizen actually holds an ownership share in this specific parcel!
    const isOwnerOfParcel = acquisition.parcel.parcelOwners.some(
      (po) => po.ownerId === targetOwnerId
    );
    if (!isOwnerOfParcel) {
      return sendError(
        res,
        403,
        `Forbidden: Citizen #${targetOwnerId} does not hold an ownership share in Parcel #${acquisition.parcelId} (${acquisition.parcel.surveyNumber}). Cannot file objection.`
      );
    }

    // Create objection record in database with initial status 'OPEN'
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

    // Broadcast the new query live to connected dashboards on the EventBus
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

    // Citizen privacy: citizen landowners see only their own grievances
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
const updateObjectionStatus = async (req, res, next) => {
  try {
    const objectionId = Number(req.params.id);
    const { status, resolutionNotes } = req.body;

    const validStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return sendError(
        res,
        400,
        `Invalid objection status. Must be one of: [${validStatuses.join(', ')}]`
      );
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
      // Record resolved timestamp if resolving or rejecting
      resolvedAt: ['RESOLVED', 'REJECTED'].includes(status) ? new Date() : null
    };

    const updated = await prisma.objection.update({
      where: { id: objectionId },
      data: updateData,
      include: { owner: true, acquisition: true }
    });

    // Broadcast resolution event to SSE stream
    eventBus.emitEvent('objection:resolved', {
      objectionId,
      acquisitionId: updated.acquisitionId,
      surveyNumber: objection.acquisition.parcel.surveyNumber,
      ownerName: objection.owner.fullName,
      newStatus: status,
      resolvedBy: req.user.name,
      resolutionNotes: resolutionNotes || 'Status updated by administrator'
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
