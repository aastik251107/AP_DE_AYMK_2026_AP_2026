const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const prisma = new PrismaClient();

/**
 * Create a new Government Infrastructure Project
 * POST /api/v1/projects
 * Access: ADMIN, OFFICER
 */
const createProject = async (req, res, next) => {
  try {
    const { name, department, budget } = req.body;

    if (!name || !department || budget === undefined) {
      return sendError(res, 400, 'Please provide project name, department, and allocated budget.');
    }

    const numericBudget = parseFloat(budget);
    if (isNaN(numericBudget) || numericBudget < 0) {
      return sendError(res, 400, 'Budget must be a non-negative number.');
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
 * Get all Projects
 * GET /api/v1/projects
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
 * Get Project by ID with full details & acquisition pipeline
 * GET /api/v1/projects/:id
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

    // Calculate budget utilization from compensations
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
 * Update Project
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
 * Delete Project
 * DELETE /api/v1/projects/:id
 * Access: ADMIN
 */
const deleteProject = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);

    // Check if project has active acquisitions
    const acqCount = await prisma.acquisition.count({
      where: { projectId }
    });

    if (acqCount > 0) {
      return sendError(
        res,
        400,
        `Cannot delete project: It has ${acqCount} linked land acquisitions. Remove them first.`
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
