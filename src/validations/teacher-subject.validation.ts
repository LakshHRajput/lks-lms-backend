import { z } from "zod";

export const teacherSubjectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  teacherId: z.coerce.number().int().positive().optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional()
});

export const createTeacherSubjectSchema = z.object({
  teacherId: z.number().int().positive(),
  subjectId: z.number().int().positive()
});

export type TeacherSubjectListQueryInput = z.infer<typeof teacherSubjectListQuerySchema>;
export type CreateTeacherSubjectInput = z.infer<typeof createTeacherSubjectSchema>;
