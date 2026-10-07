import { z } from "zod";

export const videoListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  chapterId: z.coerce.number().int().positive().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  search: z.string().trim().optional()
});

export const createVideoSchema = z.object({
  chapterId: z.number().int().positive(),
  title: z.string().trim().min(2, "Title must contain at least 2 characters").max(200),
  description: z
    .string()
    .trim()
    .max(5000, "Description is too long")
    .nullable()
    .optional(),
  videoUrl: z.string().trim().min(1, "Video URL is required").url("Video URL must be a valid URL"),
  thumbnail: z
    .string()
    .trim()
    .url("Thumbnail URL must be a valid URL")
    .nullable()
    .optional(),
  duration: z.number().int().min(0).optional(),
  order: z.number().int().min(0).default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED")
});

export const updateVideoSchema = z.object({
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
  videoUrl: z
    .string()
    .trim()
    .min(1, "Video URL is required")
    .url("Video URL must be a valid URL")
    .optional(),
  thumbnail: z
    .string()
    .trim()
    .url("Thumbnail URL must be a valid URL")
    .nullable()
    .optional(),
  duration: z.number().int().min(0).optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
});

export type VideoListQueryInput = z.infer<typeof videoListQuerySchema>;
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
