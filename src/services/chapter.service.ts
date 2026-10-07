import prisma from "../config/database.js";
import type {
  ChapterListQueryInput,
  CreateChapterInput,
  UpdateChapterInput
} from "../validations/chapter.validation.js";

const chapterSelect = {
  id: true,
  subjectId: true,
  title: true,
  slug: true,
  description: true,
  order: true,
  status: true,
  subject: {
    select: {
      id: true,
      name: true,
      slug: true,
      course: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  },
  _count: {
    select: {
      videos: true,
      notes: true,
      tests: true,
      progress: true
    }
  }
} as const;

const createSlug = (title: string): string => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  return slug || "chapter";
};

const getTeacherProfileId = async (userId: number) => {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  return teacherProfile?.id ?? null;
};

const getStudentProfileId = async (userId: number) => {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  return studentProfile?.id ?? null;
};

const applyRoleFilter = async (
  actorRole: string,
  actorUserId: number,
  where: Record<string, unknown>
) => {
  if (actorRole === "SUPER_ADMIN" || actorRole === "ADMIN") {
    return where;
  }

  if (actorRole === "TEACHER") {
    const teacherId = await getTeacherProfileId(actorUserId);

    if (!teacherId) {
      return { ...where, id: -1 };
    }

    return {
      ...where,
      subject: {
        teachers: {
          some: {
            teacherId
          }
        }
      }
    };
  }

  if (actorRole === "STUDENT") {
    const studentId = await getStudentProfileId(actorUserId);

    if (!studentId) {
      return { ...where, id: -1 };
    }

    return {
      ...where,
      subject: {
        course: {
          enrollments: {
            some: {
              studentId
            }
          }
        }
      }
    };
  }

  return { ...where, id: -1 };
};

const verifyTeacherAssignment = async (userId: number, subjectId: number) => {
  const teacherId = await getTeacherProfileId(userId);

  if (!teacherId) {
    return false;
  }

  const link = await prisma.teacherSubject.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId,
        subjectId
      }
    },
    select: { id: true }
  });

  return Boolean(link);
};

export const listChapters = async (
  actor: { userId: number; role: string },
  query: ChapterListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.subjectId === "number") {
    baseWhere.subjectId = query.subjectId;
  }

  if (query.status) {
    baseWhere.status = query.status;
  }

  if (query.search) {
    const search = query.search.trim();
    baseWhere.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { slug: { contains: search } }
    ];
  }

  const where = await applyRoleFilter(actor.role, actor.userId, baseWhere);

  const [chapters, total] = await Promise.all([
    prisma.chapter.findMany({
      where,
      select: chapterSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ order: "asc" }, { id: "asc" }]
    }),
    prisma.chapter.count({ where })
  ]);

  return {
    data: chapters,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getChapterById = async (
  actor: { userId: number; role: string },
  chapterId: number
) => {
  const where = await applyRoleFilter(actor.role, actor.userId, { id: chapterId });

  const chapter = await prisma.chapter.findFirst({
    where,
    select: chapterSelect
  });

  if (!chapter) {
    throw new Error("Chapter not found or access denied");
  }

  return chapter;
};

export const createChapter = async (
  actor: { userId: number; role: string },
  input: CreateChapterInput
) => {
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: {
      id: true,
      slug: true,
      courseId: true
    }
  });

  if (!subject) {
    throw new Error("Subject not found");
  }

  if (actor.role === "TEACHER") {
    const isAssigned = await verifyTeacherAssignment(actor.userId, input.subjectId);

    if (!isAssigned) {
      throw new Error("You are not assigned to this subject");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to create chapters");
  }

  const baseSlug = createSlug(input.title);
  let slug = `${subject.slug}-${baseSlug}`;
  let index = 1;

  while (true) {
    const existing = await prisma.chapter.findFirst({
      where: {
        subjectId: input.subjectId,
        slug
      }
    });

    if (!existing) {
      break;
    }

    slug = `${subject.slug}-${baseSlug}-${index}`;
    index += 1;
  }

  const chapter = await prisma.chapter.create({
    data: {
      subjectId: input.subjectId,
      title: input.title,
      slug,
      description: input.description ?? null,
      status: input.status,
      order: input.order
    },
    select: chapterSelect
  });

  return chapter;
};

export const updateChapter = async (
  actor: { userId: number; role: string },
  chapterId: number,
  input: UpdateChapterInput
) => {
  const existing = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      subjectId: true,
      title: true,
      slug: true
    }
  });

  if (!existing) {
    throw new Error("Chapter not found");
  }

  if (actor.role === "TEACHER") {
    const isAssigned = await verifyTeacherAssignment(actor.userId, existing.subjectId);

    if (!isAssigned) {
      throw new Error("You are not assigned to this subject");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to update chapters");
  }

  const data: {
    title?: string;
    description?: string | null;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    order?: number;
    slug?: string;
  } = {};

  if (input.title) {
    data.title = input.title;
    const subject = await prisma.subject.findUnique({
      where: { id: existing.subjectId },
      select: { slug: true }
    });

    if (subject) {
      const baseSlug = createSlug(input.title);
      let nextSlug = `${subject.slug}-${baseSlug}`;
      let index = 1;

      while (true) {
        const dup = await prisma.chapter.findFirst({
          where: {
            subjectId: existing.subjectId,
            slug: nextSlug,
            NOT: { id: chapterId }
          }
        });

        if (!dup) {
          break;
        }

        nextSlug = `${subject.slug}-${baseSlug}-${index}`;
        index += 1;
      }

      data.slug = nextSlug;
    }
  }

  if (typeof input.description !== "undefined") {
    data.description = input.description;
  }

  if (input.status) {
    data.status = input.status;
  }

  if (typeof input.order !== "undefined") {
    data.order = input.order;
  }

  const chapter = await prisma.chapter.update({
    where: { id: chapterId },
    data,
    select: chapterSelect
  });

  return chapter;
};

export const deleteChapter = async (
  actor: { userId: number; role: string },
  chapterId: number
) => {
  const existing = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, subjectId: true }
  });

  if (!existing) {
    throw new Error("Chapter not found");
  }

  if (actor.role === "TEACHER") {
    const isAssigned = await verifyTeacherAssignment(actor.userId, existing.subjectId);

    if (!isAssigned) {
      throw new Error("You are not assigned to this subject");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to delete chapters");
  }

  await prisma.chapter.delete({
    where: { id: chapterId }
  });

  return { success: true, message: "Chapter deleted successfully" };
};
