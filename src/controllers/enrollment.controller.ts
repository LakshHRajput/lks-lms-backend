import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createEnrollment,
  deleteEnrollment,
  getEnrollmentById,
  listEnrollments
} from "../services/enrollment.service.js";
import {
  createEnrollmentSchema,
  enrollmentListQuerySchema
} from "../validations/enrollment.validation.js";

export const getEnrollments = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = enrollmentListQuerySchema.parse(req.query);
  const result = await listEnrollments(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Enrollments fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getEnrollment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const enrollmentId = Number(req.params.id);
  const enrollment = await getEnrollmentById(req.user, enrollmentId);

  return res.status(200).json({
    success: true,
    message: "Enrollment fetched successfully",
    data: enrollment
  });
};

export const createNewEnrollment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createEnrollmentSchema.parse(req.body);
  const enrollment = await createEnrollment(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Enrollment created successfully",
    data: enrollment
  });
};

export const deleteEnrollmentById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const enrollmentId = Number(req.params.id);
  const result = await deleteEnrollment(req.user, enrollmentId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
