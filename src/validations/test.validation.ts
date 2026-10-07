import { z } from "zod";

export const testListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  subjectId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional(),
  search: z.string().trim().optional()
});

export const createTestSchema = z.object({
  subjectId: z.number().int().positive(),
  chapterId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(2, "Title must contain at least 2 characters").max(200),
  description: z
    .string()
    .trim()
    .max(5000, "Description is too long")
    .nullable()
    .optional(),
  duration: z.number().int().positive().nullable().optional(),
  totalMarks: z.number().int().positive(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).default("DRAFT"),
  startAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional()
});

export const updateTestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must contain at least 2 characters")
    .max(200)
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, "Description is too long")
    .nullable()
    .optional(),
  duration: z.number().int().positive().nullable().optional(),
  totalMarks: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional(),
  startAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional()
});

export type TestListQueryInput = z.infer<typeof testListQuerySchema>;
export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
