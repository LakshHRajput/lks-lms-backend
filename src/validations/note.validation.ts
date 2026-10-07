import { z } from "zod";

export const noteListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  chapterId: z.coerce.number().int().positive().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  search: z.string().trim().optional()
});

export const createNoteSchema = z.object({
  chapterId: z.number().int().positive(),
  title: z.string().trim().min(2, "Title must contain at least 2 characters").max(200),
  description: z
    .string()
    .trim()
    .max(5000, "Description is too long")
    .nullable()
    .optional(),
  fileUrl: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),
  content: z
    .string()
    .trim()
    .max(200000, "Content is too long")
    .nullable()
    .optional(),
  order: z.number().int().min(0).default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED")
});

export const updateNoteSchema = z.object({
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
  fileUrl: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),
  content: z
    .string()
    .trim()
    .max(200000, "Content is too long")
    .nullable()
    .optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
});

export type NoteListQueryInput = z.infer<typeof noteListQuerySchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
