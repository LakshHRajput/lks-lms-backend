import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createCourse,
  deleteCourse,
  getCourseById,
  listCourses,
  updateCourse
} from "../services/course.service.js";
import {
  courseListQuerySchema,
  createCourseSchema,
  updateCourseSchema
} from "../validations/course.validation.js";

export const getCourses = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = courseListQuerySchema.parse(req.query);
  const result = await listCourses(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Courses fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getCourse = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const courseId = Number(req.params.id);
  const course = await getCourseById(req.user, courseId);

  return res.status(200).json({
    success: true,
    message: "Course fetched successfully",
    data: course
  });
};

export const createNewCourse = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createCourseSchema.parse(req.body);
  const course = await createCourse(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Course created successfully",
    data: course
  });
};

export const updateCourseById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const courseId = Number(req.params.id);
  const input = updateCourseSchema.parse(req.body);
  const course = await updateCourse(req.user, courseId, input);

  return res.status(200).json({
    success: true,
    message: "Course updated successfully",
    data: course
  });
};

export const deleteCourseById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const courseId = Number(req.params.id);
  const result = await deleteCourse(req.user, courseId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
