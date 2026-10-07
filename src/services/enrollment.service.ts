import prisma from "../config/database.js";
import type {
  CreateEnrollmentInput,
  EnrollmentListQueryInput
} from "../validations/enrollment.validation.js";

const enrollmentSelect = {
  id: true,
  studentId: true,
  courseId: true,
  enrolledAt: true,
  student: {
    select: {
      id: true,
      userId: true,
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
  course: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true
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

const getTeacherProfileId = async (userId: number) => {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  return teacherProfile?.id ?? null;
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
      course: {
        subjects: {
          some: {
            teachers: {
              some: {
                teacherId
              }
            }
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
      studentId
    };
  }

  return { ...where, id: -1 };
};

export const listEnrollments = async (
  actor: { userId: number; role: string },
  query: EnrollmentListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.courseId === "number") {
    baseWhere.courseId = query.courseId;
  }

  if (typeof query.studentId === "number") {
    baseWhere.studentId = query.studentId;
  }

  if (query.search) {
    const term = query.search.trim();
    baseWhere.OR = [
      { course: { name: { contains: term } } },
      { course: { slug: { contains: term } } },
      { student: { user: { name: { contains: term } } } },
      { student: { user: { email: { contains: term } } } }
    ];
  }

  const where = await applyRoleFilter(actor.role, actor.userId, baseWhere);

  const [items, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      select: enrollmentSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { enrolledAt: "desc" }
    }),
    prisma.enrollment.count({ where })
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

export const getEnrollmentById = async (
  actor: { userId: number; role: string },
  enrollmentId: number
) => {
  const where = await applyRoleFilter(actor.role, actor.userId, { id: enrollmentId });

  const enrollment = await prisma.enrollment.findFirst({
    where,
    select: enrollmentSelect
  });

  if (!enrollment) {
    throw new Error("Enrollment not found or access denied");
  }

  return enrollment;
};

export const createEnrollment = async (
  actor: { userId: number; role: string },
  input: CreateEnrollmentInput
) => {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true, status: true }
  });

  if (!course) {
    throw new Error("Course not found");
  }

  let studentId = input.studentId ?? null;

  if (actor.role === "STUDENT") {
    const profileId = await getStudentProfileId(actor.userId);

    if (!profileId) {
      throw new Error("Student profile not found");
    }

    studentId = profileId;
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to enroll students");
  } else if (!studentId) {
    throw new Error("studentId is required for admin enrollment");
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { id: true }
  });

  if (!student) {
    throw new Error("Student profile not found");
  }

  const existing = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId: input.courseId
      }
    }
  });

  if (existing) {
    throw new Error("Student is already enrolled in this course");
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId,
      courseId: input.courseId
    },
    select: enrollmentSelect
  });

  return enrollment;
};

export const deleteEnrollment = async (
  actor: { userId: number; role: string },
  enrollmentId: number
) => {
  const existing = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, studentId: true, courseId: true }
  });

  if (!existing) {
    throw new Error("Enrollment not found");
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId || existing.studentId !== studentId) {
      throw new Error("You can only remove your own enrollments");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to delete enrollments");
  }

  await prisma.enrollment.delete({
    where: { id: enrollmentId }
  });

  return { success: true, message: "Enrollment removed successfully" };
};
