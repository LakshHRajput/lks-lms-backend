import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  getAssessmentReport,
  getLmsOverviewReport
} from "../services/report.service.js";
import {
  assessmentReportQuerySchema,
  overviewReportQuerySchema
} from "../validations/report.validation.js";

export const getLmsOverview = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const query = overviewReportQuerySchema.parse(req.query);
  const report = await getLmsOverviewReport(req.user, query);
  return res.status(200).json({
    success: true,
    message: "LMS overview report fetched successfully",
    data: report
  });
};

export const getAssessmentReports = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const query = assessmentReportQuerySchema.parse(req.query);
  const result = await getAssessmentReport(req.user, query);
  return res.status(200).json({
    success: true,
    message: "Assessment report fetched successfully",
    ...result
  });
};

export const exportAssessmentReports = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const query = assessmentReportQuerySchema.parse({ ...req.query, page: 1, limit: 100 });
  const reports = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await getAssessmentReport(req.user, { ...query, page, limit: 100 });
    reports.push(...result.data);
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  const headers = [
    "test_id",
    "test_title",
    "test_status",
    "course",
    "subject",
    "total_marks",
    "attempts",
    "submitted_attempts",
    "in_progress_attempts",
    "completion_rate_percent",
    "average_score",
    "average_percentage",
    "best_score"
  ];
  const rows = reports.map((report) => [
    report.testId,
    report.title,
    report.status,
    report.subject.course.name,
    report.subject.name,
    report.totalMarks,
    report.attempts,
    report.submittedAttempts,
    report.inProgressAttempts,
    report.completionRate,
    report.averageScore ?? "",
    report.averagePercentage ?? "",
    report.bestScore ?? ""
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => {
      const text = String(value);
      const safeText = typeof value === "string" && /^[=+@\-\t\r]/.test(text)
        ? `'${text}`
        : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    }).join(","))
    .join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=assessment-report.csv");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(csv);
};