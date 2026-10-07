import { z } from "zod";

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  feeId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive().optional(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]).optional()
});

export const createPaymentSchema = z.object({
  feeId: z.number().int().positive(),
  amount: z.number().positive(),
  paymentMethod: z.string().trim().min(2, "Payment method is required").max(100).optional().nullable(),
  transactionId: z.string().trim().max(255).optional().nullable(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]).default("SUCCESS")
});

export const updatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  paymentMethod: z.string().trim().min(2, "Payment method is required").max(100).optional().nullable(),
  transactionId: z.string().trim().max(255).optional().nullable(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]).optional()
});

export type PaymentListQueryInput = z.infer<typeof paymentListQuerySchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
