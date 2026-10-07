import prisma from "../config/database.js";
import type {
  CreateSubjectInput,
  SubjectListQueryInput,
  UpdateSubjectInput
} from "../validations/subject.validation.js";

const subjectSelect = {
  id: true,
  courseId: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  course: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  _count: {
    select: {
      chapters: true,
      teachers: true,
      tests: true
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

  return slug || "subject";
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
      teachers: {
        some: {
          teacherId
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
      course: {
        enrollments: {
          some: {
            studentId
          }
        }
      }
    };
  }

  return { ...where, id: -1 };
};

export const listSubjects = async (
  actor: { userId: number; role: string },
  query: SubjectListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.courseId === "number") {
    baseWhere.courseId = query.courseId;
  }

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

  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      select: subjectSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { id: "asc" }
    }),
    prisma.subject.count({ where })
  ]);

  return {
    data: subjects,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getSubjectById = async (
  actor: { userId: number; role: string },
  subjectId: number
) => {
  const where = await applyRoleFilter(actor.role, actor.userId, { id: subjectId });

  const subject = await prisma.subject.findFirst({
    where,
    select: subjectSelect
  });

  if (!subject) {
    throw new Error("Subject not found or access denied");
  }

  return subject;
};

export const createSubject = async (
  actor: { userId: number; role: string },
  input: CreateSubjectInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to create subjects");
  }

  const course = await prisma.course.findUnique({
    where: { id: input.courseId }
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const baseSlug = createSlug(input.name);
  let slug = `${course.slug}-${baseSlug}`;
  let index = 1;

  while (true) {
    const existing = await prisma.subject.findFirst({
      where: {
        courseId: input.courseId,
        slug
      }
    });

    if (!existing) {
      break;
    }

    slug = `${course.slug}-${baseSlug}-${index}`;
    index += 1;
  }

  const subject = await prisma.subject.create({
    data: {
      courseId: input.courseId,
      name: input.name,
      slug,
      description: input.description,
      status: input.status
    },
    select: subjectSelect
  });

  return subject;
};

export const updateSubject = async (
  actor: { userId: number; role: string },
  subjectId: number,
  input: UpdateSubjectInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to update subjects");
  }

  const existing = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  if (!existing) {
    throw new Error("Subject not found");
  }

  const data: {
    name?: string;
    description?: string | null;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
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

  const subject = await prisma.subject.update({
    where: { id: subjectId },
    data,
    select: subjectSelect
  });

  return subject;
};

export const deleteSubject = async (
  actor: { userId: number; role: string },
  subjectId: number
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to delete subjects");
  }

  const existing = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  if (!existing) {
    throw new Error("Subject not found");
  }

  await prisma.subject.delete({
    where: { id: subjectId }
  });

  return { success: true, message: "Subject deleted successfully" };
};
