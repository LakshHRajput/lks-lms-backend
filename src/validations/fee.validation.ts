import { z } from "zod";

export const feeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  studentId: z.coerce.number().int().positive().optional(),
  status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE"]).optional(),
  search: z.string().trim().optional()
});

export const createFeeSchema = z.object({
  studentId: z.number().int().positive(),
  title: z.string().trim().min(2, "Title must contain at least 2 characters").max(200),
  amount: z.number().positive(),
  dueDate: z.coerce.date().nullable().optional(),
  status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE"]).default("PENDING")
});

export const updateFeeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must contain at least 2 characters")
    .max(200)
    .optional(),
  amount: z.number().positive().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE"]).optional()
});

export type FeeListQueryInput = z.infer<typeof feeListQuerySchema>;
export type CreateFeeInput = z.infer<typeof createFeeSchema>;
export type UpdateFeeInput = z.infer<typeof updateFeeSchema>;
