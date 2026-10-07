import { z } from "zod";

export const assessmentReportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  subjectId: z.coerce.number().int().positive().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
}).refine(
  (query) => !query.from || !query.to || query.from <= query.to,
  { message: "from must be earlier than or equal to to", path: ["from"] }
);

export const overviewReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
}).refine(
  (query) => !query.from || !query.to || query.from <= query.to,
  { message: "from must be earlier than or equal to to", path: ["from"] }
);

export type AssessmentReportQueryInput = z.infer<typeof assessmentReportQuerySchema>;
export type OverviewReportQueryInput = z.infer<typeof overviewReportQuerySchema>;