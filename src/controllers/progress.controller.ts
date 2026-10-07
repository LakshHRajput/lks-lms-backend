import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  deleteProgress,
  getProgressById,
  getProgressSummary,
  listProgress,
  updateProgress,
  upsertProgress
} from "../services/progress.service.js";
import {
  createProgressSchema,
  progressListQuerySchema,
  updateProgressSchema
} from "../validations/progress.validation.js";

export const getProgress = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = progressListQuerySchema.parse(req.query);
  const result = await listProgress(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Progress fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getProgressEntry = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const progressId = Number(req.params.id);
  const progress = await getProgressById(req.user, progressId);

  return res.status(200).json({
    success: true,
    message: "Progress record fetched successfully",
    data: progress
  });
};

export const createOrUpdateProgress = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createProgressSchema.parse(req.body);
  const progress = await upsertProgress(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Progress updated successfully",
    data: progress
  });
};

export const updateProgressById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const progressId = Number(req.params.id);
  const input = updateProgressSchema.parse(req.body);
  const progress = await updateProgress(req.user, progressId, input);

  return res.status(200).json({
    success: true,
    message: "Progress record updated successfully",
    data: progress
  });
};

export const deleteProgressById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const progressId = Number(req.params.id);
  const result = await deleteProgress(req.user, progressId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};

export const getProgressSummaryReport = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
  const summary = await getProgressSummary(req.user, studentId);

  return res.status(200).json({
    success: true,
    message: "Progress summary fetched successfully",
    data: summary
  });
};
