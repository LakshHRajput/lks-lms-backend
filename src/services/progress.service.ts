import prisma from "../config/database.js";
import { HttpError } from "../utils/http-error.js";
import type {
  CreateProgressInput,
  ProgressListQueryInput,
  UpdateProgressInput
} from "../validations/progress.validation.js";

const progressSelect = {
  id: true,
  studentId: true,
  chapterId: true,
  completed: true,
  progress: true,
  lastAccessedAt: true,
  student: {
    select: {
      id: true,
      studentCode: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  },
  chapter: {
    select: {
      id: true,
      title: true,
      slug: true,
      subject: {
        select: {
          id: true,
          name: true,
          course: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }
    }
  }
} as const;

const getStudentProfileId = async (userId: number) => {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  return studentProfile?.id ?? null;
};

export const listProgress = async (
  actor: { userId: number; role: string },
  query: ProgressListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.studentId === "number") {
    baseWhere.studentId = query.studentId;
  }

  if (typeof query.chapterId === "number") {
    baseWhere.chapterId = query.chapterId;
  }

  if (typeof query.completed === "boolean") {
    baseWhere.completed = query.completed;
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId) {
      return {
        data: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 1
        }
      };
    }

    baseWhere.studentId = studentId;
  }

  const [progress, total] = await Promise.all([
    prisma.studentProgress.findMany({
      where: baseWhere,
      select: progressSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ lastAccessedAt: "desc" }, { id: "desc" }]
    }),
    prisma.studentProgress.count({ where: baseWhere })
  ]);

  return {
    data: progress,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getProgressById = async (
  actor: { userId: number; role: string },
  progressId: number
) => {
  const progress = await prisma.studentProgress.findUnique({
    where: { id: progressId },
    select: progressSelect
  });

  if (!progress) {
    throw new Error("Progress record not found");
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId || progress.studentId !== studentId) {
      throw new Error("Progress record not found or access denied");
    }
  }

  return progress;
};

export const upsertProgress = async (
  actor: { userId: number; role: string },
  input: CreateProgressInput
) => {
  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId || studentId !== input.studentId) {
      throw new Error("You can only update your own chapter progress");
    }
  }

  if (!["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"].includes(actor.role)) {
    throw new Error("You do not have permission to update progress");
  }

  const progress = await prisma.studentProgress.upsert({
    where: {
      studentId_chapterId: {
        studentId: input.studentId,
        chapterId: input.chapterId
      }
    },
    update: {
      progress: input.progress,
      completed: input.completed,
      lastAccessedAt: input.lastAccessedAt ?? new Date()
    },
    create: {
      studentId: input.studentId,
      chapterId: input.chapterId,
      progress: input.progress,
      completed: input.completed,
      lastAccessedAt: input.lastAccessedAt ?? new Date()
    },
    select: progressSelect
  });

  return progress;
};

export const updateProgress = async (
  actor: { userId: number; role: string },
  progressId: number,
  input: UpdateProgressInput
) => {
  const existing = await prisma.studentProgress.findUnique({
    where: { id: progressId },
    select: {
      id: true,
      studentId: true,
      chapterId: true
    }
  });

  if (!existing) {
    throw new Error("Progress record not found");
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId || existing.studentId !== studentId) {
      throw new Error("You can only update your own progress");
    }
  }

  const progress = await prisma.studentProgress.update({
    where: { id: progressId },
    data: {
      ...(typeof input.studentId !== "undefined" ? { studentId: input.studentId } : {}),
      ...(typeof input.chapterId !== "undefined" ? { chapterId: input.chapterId } : {}),
      ...(typeof input.progress !== "undefined" ? { progress: input.progress } : {}),
      ...(typeof input.completed !== "undefined" ? { completed: input.completed } : {}),
      lastAccessedAt: input.lastAccessedAt ?? new Date()
    },
    select: progressSelect
  });

  return progress;
};

export const deleteProgress = async (
  actor: { userId: number; role: string },
  progressId: number
) => {
  if (!["SUPER_ADMIN", "ADMIN", "TEACHER"].includes(actor.role)) {
    throw new HttpError("You do not have permission to delete progress records", 403);
  }

  const progress = await prisma.studentProgress.findUnique({
    where: { id: progressId },
    select: { id: true }
  });

  if (!progress) {
    throw new Error("Progress record not found");
  }

  await prisma.studentProgress.delete({ where: { id: progressId } });

  return { message: "Progress record deleted successfully" };
};

export const getProgressSummary = async (
  actor: { userId: number; role: string },
  studentId?: number
) => {
  const targetStudentId = studentId ?? (actor.role === "STUDENT" ? await getStudentProfileId(actor.userId) : undefined);

  if (actor.role === "STUDENT" && (!targetStudentId || targetStudentId !== (await getStudentProfileId(actor.userId)))) {
    throw new Error("You can only view your own progress summary");
  }

  const where = targetStudentId ? { studentId: targetStudentId } : {};

  const [entries, completedCount, averageProgress, total] = await Promise.all([
    prisma.studentProgress.findMany({
      where,
      select: progressSelect,
      orderBy: [{ progress: "desc" }, { id: "asc" }]
    }),
    prisma.studentProgress.count({
      where: { ...where, completed: true }
    }),
    prisma.studentProgress.aggregate({
      where,
      _avg: { progress: true }
    }),
    prisma.studentProgress.count({ where })
  ]);

  return {
    studentId: targetStudentId ?? null,
    totalEntries: total,
    completedChapters: completedCount,
    averageProgress: Number(averageProgress._avg.progress ?? 0),
    entries
  };
};
