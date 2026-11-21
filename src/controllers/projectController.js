// ============================================================================
// 🏗️ INFRASTRUCTURE PROJECTS CONTROLLER (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/controllers/projectController.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "REST API(s), Resource Based URL(s), Prisma CRUD, Prisma Relation Filtering"
//
// 💡 WHAT THIS CONTROLLER DOES:
// Manages public infrastructure schemes (Highway NH-167, Metro, Canals) that
// require land acquisition. Tracks total allocated public budget and calculates
// how much money has been committed to compensation vouchers.
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const prisma = new PrismaClient();

/**
 * 1. CREATE A NEW INFRASTRUCTURE PROJECT
 * POST /api/v1/projects
 * Access: ADMIN
 * Body: { name, department, budget }
 */
const createProject = async (req, res, next) => {
  try {
    const { name, department, budget } = req.body;

    // Validate presence of required fields
    if (!name || !department || budget === undefined) {
      return sendError(
        res,
        400,
        'Please provide project name, government department, and allocated budget.'
      );
    }

    // Parse and validate non-negative budget
    const numericBudget = parseFloat(budget);
    if (isNaN(numericBudget) || numericBudget < 0) {
      return sendError(res, 400, 'Budget must be a valid non-negative number.');
    }

    const project = await prisma.project.create({
      data: {
        name,
        department,
        budget: numericBudget
      }
    });

    return sendSuccess(res, 201, 'Government infrastructure project created', project);
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET ALL PROJECTS WITH OPTIONAL FILTERING
 * GET /api/v1/projects
 * Query params: ?department=NHAI&search=Highway
 * 
 * 💡 LECTURE TOPIC: Prisma Relation Filtering & Counts
 * `_count: { select: { acquisitions: true } }` counts how many land parcels
 * are currently linked to this project without having to load all records!
 */
const getProjects = async (req, res, next) => {
  try {
    const { department, search } = req.query;

    const where = {};
    if (department) {
      where.department = { contains: department };
    }
    if (search) {
      where.name = { contains: search };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: {
          select: { acquisitions: true }
        }
      },
      orderBy: { id: 'desc' }
    });

    return sendSuccess(res, 200, 'Projects retrieved successfully', projects);
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET PROJECT BY ID (WITH FULL BUDGET AUDIT)
 * GET /api/v1/projects/:id
 * 
 * 💡 BUSINESS LOGIC:
 * Calculates total compensation committed across all acquisitions, and computes
 * the remaining available project budget:
 * `remainingBudget = project.budget - totalCompensationCommitted`
 */
const getProjectById = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        acquisitions: {
          include: {
            parcel: true,
            createdBy: { select: { id: true, name: true, email: true } },
            compensations: true
          }
        }
      }
    });

    if (!project) {
      return sendError(res, 404, `Project with ID ${projectId} not found.`);
    }

    // Compute sum of all compensation money committed
    let totalCompensationCommitted = 0;
    project.acquisitions.forEach((acq) => {
      acq.compensations.forEach((comp) => {
        totalCompensationCommitted += comp.amount;
      });
    });

    const enrichedProject = {
      ...project,
      totalCompensationCommitted,
      remainingBudget: project.budget - totalCompensationCommitted
    };

    return sendSuccess(res, 200, 'Project details retrieved', enrichedProject);
  } catch (error) {
    next(error);
  }
};

/**
 * 4. UPDATE PROJECT
 * PUT /api/v1/projects/:id
 * Access: ADMIN
 */
const updateProject = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { name, department, budget } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (department) updateData.department = department;
    if (budget !== undefined) {
      const numericBudget = parseFloat(budget);
      if (isNaN(numericBudget) || numericBudget < 0) {
        return sendError(res, 400, 'Budget must be a non-negative number.');
      }
      updateData.budget = numericBudget;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData
    });

    return sendSuccess(res, 200, 'Project updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * 5. DELETE PROJECT (SAFE DELETION)
 * DELETE /api/v1/projects/:id
 * Access: ADMIN
 * 
 * 💡 REFERENTIAL INTEGRITY CHECK:
 * We prevent accidental deletion if land parcels are already actively being acquired!
 */
const deleteProject = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);

    const acqCount = await prisma.acquisition.count({
      where: { projectId }
    });

    if (acqCount > 0) {
      return sendError(
        res,
        400,
        `Cannot delete project #${projectId}: It is linked to ${acqCount} active land acquisitions. Please cancel or remove them first.`
      );
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    return sendSuccess(res, 200, `Project #${projectId} deleted successfully`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
};
