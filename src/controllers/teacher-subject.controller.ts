import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  assignTeacherToSubject,
  listTeacherSubjects,
  removeTeacherFromSubject
} from "../services/teacher-subject.service.js";
import {
  createTeacherSubjectSchema,
  teacherSubjectListQuerySchema
} from "../validations/teacher-subject.validation.js";

export const getTeacherSubjects = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = teacherSubjectListQuerySchema.parse(req.query);
  const result = await listTeacherSubjects(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Teacher subject assignments fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const createTeacherSubject = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createTeacherSubjectSchema.parse(req.body);
  const assignment = await assignTeacherToSubject(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Teacher assigned to subject successfully",
    data: assignment
  });
};

export const deleteTeacherSubject = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const subjectId = Number(req.params.subjectId);
  const teacherId = Number(req.params.teacherId);
  const result = await removeTeacherFromSubject(req.user, subjectId, teacherId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
