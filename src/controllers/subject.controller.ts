import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createSubject,
  deleteSubject,
  getSubjectById,
  listSubjects,
  updateSubject
} from "../services/subject.service.js";
import {
  createSubjectSchema,
  subjectListQuerySchema,
  updateSubjectSchema
} from "../validations/subject.validation.js";

export const getSubjects = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = subjectListQuerySchema.parse(req.query);
  const result = await listSubjects(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Subjects fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getSubject = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const subjectId = Number(req.params.id);
  const subject = await getSubjectById(req.user, subjectId);

  return res.status(200).json({
    success: true,
    message: "Subject fetched successfully",
    data: subject
  });
};

export const createNewSubject = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createSubjectSchema.parse(req.body);
  const subject = await createSubject(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Subject created successfully",
    data: subject
  });
};

export const updateSubjectById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const subjectId = Number(req.params.id);
  const input = updateSubjectSchema.parse(req.body);
  const subject = await updateSubject(req.user, subjectId, input);

  return res.status(200).json({
    success: true,
    message: "Subject updated successfully",
    data: subject
  });
};

export const deleteSubjectById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const subjectId = Number(req.params.id);
  const result = await deleteSubject(req.user, subjectId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
