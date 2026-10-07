import { z } from "zod";

export const subjectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  courseId: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
});

export const createSubjectSchema = z.object({
  courseId: z.coerce.number().int().min(1),
  name: z
    .string()
    .trim()
    .min(2, "Subject name must contain at least 2 characters")
    .max(200),

  description: z.string().trim().max(2000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED")
});

export const updateSubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Subject name must contain at least 2 characters")
    .max(200)
    .optional(),

  description: z.string().trim().max(2000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
});

export type SubjectListQueryInput = z.infer<typeof subjectListQuerySchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
