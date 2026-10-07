import prisma from "../config/database.js";
import type {
  CreateTestInput,
  TestListQueryInput,
  UpdateTestInput
} from "../validations/test.validation.js";

const testSelect = {
  id: true,
  subjectId: true,
  chapterId: true,
  createdById: true,
  title: true,
  description: true,
  duration: true,
  totalMarks: true,
  status: true,
  startAt: true,
  endAt: true,
  createdAt: true,
  updatedAt: true,
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
  chapter: {
    select: {
      id: true,
      title: true,
      slug: true
    }
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  },
  _count: {
    select: {
      questions: true,
      attempts: true
    }
  }
} as const;

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

const ensureSubjectAccess = async (
  actor: { userId: number; role: string },
  subjectId: number
) => {
  if (actor.role === "SUPER_ADMIN" || actor.role === "ADMIN") {
    return true;
  }

  if (actor.role === "TEACHER") {
    return verifyTeacherAssignment(actor.userId, subjectId);
  }

  return false;
};

export const listTests = async (
  actor: { userId: number; role: string },
  query: TestListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.subjectId === "number") {
    baseWhere.subjectId = query.subjectId;
  }

  if (typeof query.chapterId === "number") {
    baseWhere.chapterId = query.chapterId;
  }

  if (query.status) {
    baseWhere.status = query.status;
  }

  if (query.search) {
    const search = query.search.trim();
    baseWhere.OR = [
      { title: { contains: search } },
      { description: { contains: search } }
    ];
  }

  if (actor.role === "SUPER_ADMIN" || actor.role === "ADMIN") {
    // unrestricted access for admin roles
  } else if (actor.role === "TEACHER") {
    const teacherId = await getTeacherProfileId(actor.userId);

    if (!teacherId) {
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

    baseWhere.OR = [
      { createdById: actor.userId },
      { subject: { teachers: { some: { teacherId } } } }
    ];
  } else if (actor.role === "STUDENT") {
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

    baseWhere.subject = {
      course: {
        enrollments: {
          some: {
            studentId
          }
        }
      }
    };
  } else {
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

  const [tests, total] = await Promise.all([
    prisma.test.findMany({
      where: baseWhere,
      select: testSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    prisma.test.count({ where: baseWhere })
  ]);

  return {
    data: tests,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getTestById = async (
  actor: { userId: number; role: string },
  testId: number
) => {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: testSelect
  });

  if (!test) {
    throw new Error("Test not found");
  }

  if (actor.role === "SUPER_ADMIN" || actor.role === "ADMIN") {
    return test;
  }

  if (actor.role === "TEACHER") {
    const hasAccess =
      test.createdById === actor.userId ||
      (await verifyTeacherAssignment(actor.userId, test.subjectId));

    if (!hasAccess) {
      throw new Error("Test not found or access denied");
    }

    return test;
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);
    if (!studentId) {
      throw new Error("Test not found or access denied");
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        courseId: test.subject.course.id
      },
      select: { id: true }
    });

    if (!enrollment) {
      throw new Error("Test not found or access denied");
    }

    return test;
  }

  throw new Error("Test not found or access denied");
};

export const createTest = async (
  actor: { userId: number; role: string },
  input: CreateTestInput
) => {
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, courseId: true }
  });

  if (!subject) {
    throw new Error("Subject not found");
  }

  if (input.chapterId) {
    const chapter = await prisma.chapter.findFirst({
      where: {
        id: input.chapterId,
        subjectId: input.subjectId
      },
      select: { id: true }
    });

    if (!chapter) {
      throw new Error("Chapter not found for the selected subject");
    }
  }

  if (actor.role === "TEACHER") {
    const hasAccess = await ensureSubjectAccess(actor, input.subjectId);
    if (!hasAccess) {
      throw new Error("You are not assigned to this subject");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to create tests");
  }

  return prisma.test.create({
    data: {
      subjectId: input.subjectId,
      chapterId: input.chapterId ?? null,
      createdById: actor.userId,
      title: input.title,
      description: input.description ?? null,
      duration: input.duration ?? null,
      totalMarks: input.totalMarks,
      status: input.status,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null
    },
    select: testSelect
  });
};

export const updateTest = async (
  actor: { userId: number; role: string },
  testId: number,
  input: UpdateTestInput
) => {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      subjectId: true,
      createdById: true
    }
  });

  if (!test) {
    throw new Error("Test not found");
  }

  if (actor.role === "TEACHER") {
    const hasAccess =
      test.createdById === actor.userId ||
      (await verifyTeacherAssignment(actor.userId, test.subjectId));

    if (!hasAccess) {
      throw new Error("You do not have permission to update this test");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to update this test");
  }

  return prisma.test.update({
    where: { id: testId },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.duration !== undefined ? { duration: input.duration } : {}),
      ...(input.totalMarks ? { totalMarks: input.totalMarks } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
      ...(input.endAt !== undefined ? { endAt: input.endAt } : {})
    },
    select: testSelect
  });
};

export const deleteTest = async (
  actor: { userId: number; role: string },
  testId: number
) => {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      subjectId: true,
      createdById: true
    }
  });

  if (!test) {
    throw new Error("Test not found");
  }

  if (actor.role === "TEACHER") {
    const hasAccess =
      test.createdById === actor.userId ||
      (await verifyTeacherAssignment(actor.userId, test.subjectId));

    if (!hasAccess) {
      throw new Error("You do not have permission to delete this test");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to delete this test");
  }

  await prisma.test.delete({ where: { id: testId } });

  return { message: "Test deleted successfully" };
};
