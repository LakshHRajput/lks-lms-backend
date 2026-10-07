import { z } from "zod";

export const attemptListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  testId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive().optional()
});

export const saveAttemptAnswersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    selectedOptionId: z.number().int().positive().nullable().optional(),
    answerText: z.string().trim().max(5000).nullable().optional()
  }).refine(
    (answer) => answer.selectedOptionId !== undefined || answer.answerText !== undefined,
    "Each answer must include a selected option or answer text"
  )).min(1).max(200).refine(
    (answers) => new Set(answers.map((answer) => answer.questionId)).size === answers.length,
    "A question can only appear once per request"
  )
});

export const gradeAttemptAnswersSchema = z.object({
  grades: z.array(z.object({
    answerId: z.number().int().positive(),
    marks: z.number().min(0)
  })).min(1).max(200).refine(
    (grades) => new Set(grades.map((grade) => grade.answerId)).size === grades.length,
    "An answer can only appear once per grading request"
  )
});

export type AttemptListQueryInput = z.infer<typeof attemptListQuerySchema>;
export type SaveAttemptAnswersInput = z.infer<typeof saveAttemptAnswersSchema>;
export type GradeAttemptAnswersInput = z.infer<typeof gradeAttemptAnswersSchema>;