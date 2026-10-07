import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  deleteAttendance,
  getAttendanceById,
  listAttendances,
  markAttendance,
  updateAttendance
} from "../services/attendance.service.js";
import {
  attendanceListQuerySchema,
  createAttendanceSchema,
  updateAttendanceSchema
} from "../validations/attendance.validation.js";

export const getAttendances = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = attendanceListQuerySchema.parse(req.query);
  const result = await listAttendances(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Attendance fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getAttendance = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const attendanceId = Number(req.params.id);
  const attendance = await getAttendanceById(req.user, attendanceId);

  return res.status(200).json({
    success: true,
    message: "Attendance record fetched successfully",
    data: attendance
  });
};

export const createNewAttendance = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createAttendanceSchema.parse(req.body);
  const attendance = await markAttendance(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Attendance marked successfully",
    data: attendance
  });
};

export const updateAttendanceById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const attendanceId = Number(req.params.id);
  const input = updateAttendanceSchema.parse(req.body);
  const attendance = await updateAttendance(req.user, attendanceId, input);

  return res.status(200).json({
    success: true,
    message: "Attendance updated successfully",
    data: attendance
  });
};

export const deleteAttendanceById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const attendanceId = Number(req.params.id);
  const result = await deleteAttendance(req.user, attendanceId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
