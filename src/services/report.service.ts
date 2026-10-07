import prisma from "../config/database.js";
import { HttpError } from "../utils/http-error.js";
import type {
  AssessmentReportQueryInput,
  OverviewReportQueryInput
} from "../validations/report.validation.js";

export const getLmsOverviewReport = async (
  actor: { userId: number; role: string },
  query: OverviewReportQueryInput
) => {
  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
    throw new HttpError("You do not have permission to view LMS overview reports", 403);
  }

  const now = new Date();
  const from = query.from ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = query.to ?? now;
  const dateRange = { gte: from, lte: to };

  const [users, attendance, fees, payments, progress, completedProgress, attempts] = await Promise.all([
    prisma.user.groupBy({
      by: ["role"],
      where: { isActive: true },
      _count: { _all: true }
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { date: dateRange },
      _count: { _all: true }
    }),
    prisma.fee.aggregate({
      where: { createdAt: dateRange },
      _count: { _all: true },
      _sum: { amount: true, paidAmount: true }
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where: { createdAt: dateRange },
      _count: { _all: true },
      _sum: { amount: true }
    }),
    prisma.studentProgress.aggregate({
      where: { lastAccessedAt: dateRange },
      _count: { _all: true },
      _avg: { progress: true }
    }),
    prisma.studentProgress.count({
      where: { lastAccessedAt: dateRange, completed: true }
    }),
    prisma.examAttempt.groupBy({
      by: ["status"],
      where: { startedAt: dateRange },
      _count: { _all: true },
      _avg: { score: true }
    })
  ]);

  return {
    period: { from, to },
    users: users.map((item) => ({ role: item.role, activeCount: item._count._all })),
    attendance: attendance.map((item) => ({ status: item.status, count: item._count._all })),
    fees: {
      recordsCreated: fees._count._all,
      billedAmount: Number(fees._sum.amount ?? 0),
      paidAmount: Number(fees._sum.paidAmount ?? 0),
      outstandingAmount: Math.max(0, Number(fees._sum.amount ?? 0) - Number(fees._sum.paidAmount ?? 0))
    },
    payments: payments.map((item) => ({
      status: item.status,
      count: item._count._all,
      amount: Number(item._sum.amount ?? 0)
    })),
    learningProgress: {
      entries: progress._count._all,
      completedEntries: completedProgress,
      averagePercent: Number((progress._avg.progress ?? 0).toFixed(2))
    },
    attempts: attempts.map((item) => ({
      status: item.status,
      count: item._count._all,
      averageScore: item._avg.score === null ? null : Number(item._avg.score.toFixed(2))
    }))
  };
};

export const getAssessmentReport = async (
  actor: { userId: number; role: string },
  query: AssessmentReportQueryInput
) => {
  const where: Record<string, unknown> = {};
  if (query.subjectId) {
    where.subjectId = query.subjectId;
  }
  if (query.courseId) {
    where.subject = { courseId: query.courseId };
  }

  if (actor.role === "TEACHER") {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!teacher) {
      return {
        data: [],
        summary: { tests: 0, attempts: 0, submittedAttempts: 0, completionRate: 0 },
        pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 1 }
      };
    }
    where.subject = {
      ...(where.subject as Record<string, unknown> | undefined),
      teachers: { some: { teacherId: teacher.id } }
    };
  } else if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
    throw new HttpError("You do not have permission to view assessment reports", 403);
  }

  const [tests, total] = await Promise.all([
    prisma.test.findMany({
      where,
      select: {
        id: true,
        title: true,
        totalMarks: true,
        status: true,
        subject: {
          select: {
            id: true,
            name: true,
            course: { select: { id: true, name: true } }
          }
        }
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    prisma.test.count({ where })
  ]);

  const testIds = tests.map((test) => test.id);
  const attemptWhere: Record<string, unknown> = { testId: { in: testIds } };
  if (query.from || query.to) {
    attemptWhere.startedAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {})
    };
  }

  const attemptGroups = testIds.length > 0
    ? await prisma.examAttempt.groupBy({
        by: ["testId", "status"],
        where: attemptWhere,
        _count: { _all: true, score: true },
        _avg: { score: true },
        _max: { score: true }
      })
    : [];

  const reports = tests.map((exam) => {
    const groups = attemptGroups.filter((group) => group.testId === exam.id);
    const attempts = groups.reduce((count, group) => count + group._count._all, 0);
    const submittedAttempts = groups
      .filter((group) => group.status !== "IN_PROGRESS")
      .reduce((count, group) => count + group._count._all, 0);
    const scoredCount = groups.reduce((count, group) => count + group._count.score, 0);
    const scoreTotal = groups.reduce(
      (sum, group) => sum + Number(group._avg.score ?? 0) * group._count.score,
      0
    );
    const bestScore = groups.reduce<number | null>(
      (best, group) => group._max.score === null ? best : Math.max(best ?? 0, group._max.score),
      null
    );
    const averageScore = scoredCount > 0 ? scoreTotal / scoredCount : null;

    return {
      testId: exam.id,
      title: exam.title,
      status: exam.status,
      totalMarks: exam.totalMarks,
      subject: exam.subject,
      attempts,
      submittedAttempts,
      inProgressAttempts: attempts - submittedAttempts,
      completionRate: attempts > 0 ? Number((submittedAttempts / attempts * 100).toFixed(2)) : 0,
      averageScore: averageScore === null ? null : Number(averageScore.toFixed(2)),
      averagePercentage: averageScore === null ? null : Number((averageScore / exam.totalMarks * 100).toFixed(2)),
      bestScore
    };
  });

  const attemptCount = reports.reduce((sum, report) => sum + report.attempts, 0);
  const submittedCount = reports.reduce((sum, report) => sum + report.submittedAttempts, 0);

  return {
    data: reports,
    summary: {
      tests: total,
      attempts: attemptCount,
      submittedAttempts: submittedCount,
      completionRate: attemptCount > 0 ? Number((submittedCount / attemptCount * 100).toFixed(2)) : 0
    },
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};