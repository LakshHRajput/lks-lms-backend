import prisma from "../config/database.js";
import type {
  CreateCourseInput,
  CourseListQueryInput,
  UpdateCourseInput
} from "../validations/course.validation.js";

const courseSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
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
      subjects: true,
      enrollments: true
    }
  }
} as const;

const createSlug = (input: string): string => {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  return slug || "course";
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
      subjects: {
        some: {
          teachers: {
            some: { teacherId }
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
      enrollments: {
        some: {
          studentId
        }
      }
    };
  }

  return { ...where, id: -1 };
};

export const listCourses = async (
  actor: { userId: number; role: string },
  query: CourseListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (query.status) {
    baseWhere.status = query.status;
  }

  if (query.search) {
    const search = query.search.trim();
    baseWhere.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { slug: { contains: search } }
    ];
  }

  const where = await applyRoleFilter(actor.role, actor.userId, baseWhere);

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      select: courseSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.course.count({ where })
  ]);

  return {
    data: courses,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getCourseById = async (
  actor: { userId: number; role: string },
  courseId: number
) => {
  const where = await applyRoleFilter(actor.role, actor.userId, { id: courseId });

  const course = await prisma.course.findFirst({
    where,
    select: courseSelect
  });

  if (!course) {
    throw new Error("Course not found or access denied");
  }

  return course;
};

export const createCourse = async (
  actor: { userId: number; role: string },
  input: CreateCourseInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to create courses");
  }

  const baseSlug = createSlug(input.name);
  let slug = baseSlug;
  let index = 1;

  while (true) {
    const existing = await prisma.course.findUnique({
      where: { slug }
    });

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  const course = await prisma.course.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      status: input.status,
      createdById: actor.userId
    },
    select: courseSelect
  });

  return course;
};

export const updateCourse = async (
  actor: { userId: number; role: string },
  courseId: number,
  input: UpdateCourseInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to update courses");
  }

  const existing = await prisma.course.findUnique({
    where: { id: courseId }
  });

  if (!existing) {
    throw new Error("Course not found");
  }

  const data: {
    name?: string;
    description?: string | null;
    status?: "ACTIVE" | "INACTIVE";
    slug?: string;
  } = {};

  if (input.name) {
    data.name = input.name;
    data.slug = createSlug(input.name);
  }

  if (typeof input.description !== "undefined") {
    data.description = input.description;
  }

  if (input.status) {
    data.status = input.status;
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data,
    select: courseSelect
  });

  return course;
};

export const deleteCourse = async (
  actor: { userId: number; role: string },
  courseId: number
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to delete courses");
  }

  const existing = await prisma.course.findUnique({
    where: { id: courseId }
  });

  if (!existing) {
    throw new Error("Course not found");
  }

  await prisma.course.delete({
    where: { id: courseId }
  });

  return { success: true, message: "Course deleted successfully" };
};
