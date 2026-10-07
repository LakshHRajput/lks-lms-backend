import { z } from "zod";

export const attendanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  studentId: z.coerce.number().int().positive().optional(),
  date: z.coerce.date().optional(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]).optional()
});

export const createAttendanceSchema = z.object({
  studentId: z.number().int().positive(),
  date: z.coerce.date(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
  remarks: z.string().trim().max(1000).nullable().optional()
});

export const updateAttendanceSchema = z.object({
  studentId: z.number().int().positive().optional(),
  date: z.coerce.date().optional(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]).optional(),
  remarks: z.string().trim().max(1000).nullable().optional()
});

export type AttendanceListQueryInput = z.infer<typeof attendanceListQuerySchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
