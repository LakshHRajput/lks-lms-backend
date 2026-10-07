import { z } from "zod";

export const courseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});

export const createCourseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Course name must contain at least 2 characters")
    .max(200),

  description: z.string().trim().max(2000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

export const updateCourseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Course name must contain at least 2 characters")
    .max(200)
    .optional(),

  description: z.string().trim().max(2000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});

export type CourseListQueryInput = z.infer<typeof courseListQuerySchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
