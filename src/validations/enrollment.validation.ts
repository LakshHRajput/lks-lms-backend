import { z } from "zod";

export const enrollmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  courseId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional()
});

export const createEnrollmentSchema = z.object({
  courseId: z.number().int().positive(),
  studentId: z.number().int().positive().optional()
});

export type EnrollmentListQueryInput = z.infer<typeof enrollmentListQuerySchema>;
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
