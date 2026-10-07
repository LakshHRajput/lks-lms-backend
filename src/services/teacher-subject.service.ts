import prisma from "../config/database.js";
import type {
  CreateTeacherSubjectInput,
  TeacherSubjectListQueryInput
} from "../validations/teacher-subject.validation.js";

const teacherSubjectSelect = {
  id: true,
  teacherId: true,
  subjectId: true,
  teacher: {
    select: {
      id: true,
      userId: true,
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
      teacherId
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

export const listTeacherSubjects = async (
  actor: { userId: number; role: string },
  query: TeacherSubjectListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.teacherId === "number") {
    baseWhere.teacherId = query.teacherId;
  }

  if (typeof query.subjectId === "number") {
    baseWhere.subjectId = query.subjectId;
  }

  if (query.search) {
    const term = query.search.trim();
    baseWhere.OR = [
      { teacher: { user: { name: { contains: term } } } },
      { teacher: { user: { email: { contains: term } } } },
      { subject: { name: { contains: term } } },
      { subject: { slug: { contains: term } } }
    ];
  }

  const where = await applyRoleFilter(actor.role, actor.userId, baseWhere);

  const [items, total] = await Promise.all([
    prisma.teacherSubject.findMany({
      where,
      select: teacherSubjectSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ subject: { name: "asc" } }, { id: "asc" }]
    }),
    prisma.teacherSubject.count({ where })
  ]);

  return {
    data: items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const assignTeacherToSubject = async (
  actor: { userId: number; role: string },
  input: CreateTeacherSubjectInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to assign teachers to subjects");
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { id: input.teacherId },
    select: { id: true, userId: true }
  });

  if (!teacherProfile) {
    throw new Error("Teacher profile not found");
  }

  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true }
  });

  if (!subject) {
    throw new Error("Subject not found");
  }

  const existing = await prisma.teacherSubject.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId: input.teacherId,
        subjectId: input.subjectId
      }
    }
  });

  if (existing) {
    throw new Error("Teacher is already assigned to this subject");
  }

  const assignment = await prisma.teacherSubject.create({
    data: {
      teacherId: input.teacherId,
      subjectId: input.subjectId
    },
    select: teacherSubjectSelect
  });

  return assignment;
};

export const removeTeacherFromSubject = async (
  actor: { userId: number; role: string },
  subjectId: number,
  teacherId: number
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to remove teacher assignments");
  }

  const existing = await prisma.teacherSubject.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId,
        subjectId
      }
    }
  });

  if (!existing) {
    throw new Error("Teacher assignment not found");
  }

  await prisma.teacherSubject.delete({
    where: {
      teacherId_subjectId: {
        teacherId,
        subjectId
      }
    }
  });

  return { success: true, message: "Teacher removed from subject successfully" };
};
