import { z } from "zod";

export const progressListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  studentId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional(),
  completed: z.coerce.boolean().optional()
});

export const createProgressSchema = z.object({
  studentId: z.number().int().positive(),
  chapterId: z.number().int().positive(),
  progress: z.number().int().min(0).max(100).default(0),
  completed: z.boolean().default(false),
  lastAccessedAt: z.coerce.date().nullable().optional()
});

export const updateProgressSchema = z.object({
  studentId: z.number().int().positive().optional(),
  chapterId: z.number().int().positive().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  completed: z.boolean().optional(),
  lastAccessedAt: z.coerce.date().nullable().optional()
});

export type ProgressListQueryInput = z.infer<typeof progressListQuerySchema>;
export type CreateProgressInput = z.infer<typeof createProgressSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
