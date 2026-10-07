import { z } from "zod";

export const questionOptionSchema = z.object({
  optionText: z.string().trim().min(1, "Option text is required").max(2000),
  isCorrect: z.boolean().default(false),
  order: z.number().int().min(0).default(0)
});

export const questionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const createQuestionSchema = z.object({
  question: z.string().trim().min(3, "Question must contain at least 3 characters").max(5000),
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER"]).default("MCQ"),
  marks: z.number().int().min(1).default(1),
  negativeMarks: z.number().min(0).default(0),
  order: z.number().int().min(0).default(0),
  options: z.array(questionOptionSchema).default([])
});

export const updateQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Question must contain at least 3 characters")
    .max(5000)
    .optional(),
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER"]).optional(),
  marks: z.number().int().min(1).optional(),
  negativeMarks: z.number().min(0).optional(),
  order: z.number().int().min(0).optional(),
  options: z.array(questionOptionSchema).optional()
});

export type QuestionListQueryInput = z.infer<typeof questionListQuerySchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
