import prisma from "../config/database.js";
import type {
  CreateNoteInput,
  NoteListQueryInput,
  UpdateNoteInput
} from "../validations/note.validation.js";

const noteSelect = {
  id: true,
  chapterId: true,
  title: true,
  description: true,
  fileUrl: true,
  content: true,
  order: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  chapter: {
    select: {
      id: true,
      title: true,
      slug: true,
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

const verifyTeacherAssignment = async (userId: number, chapterId: number) => {
  const teacherId = await getTeacherProfileId(userId);

  if (!teacherId) {
    return false;
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { subjectId: true }
  });

  if (!chapter) {
    return false;
  }

  const link = await prisma.teacherSubject.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId,
        subjectId: chapter.subjectId
      }
    },
    select: { id: true }
  });

  return Boolean(link);
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
      chapter: {
        subject: {
          teachers: {
            some: {
              teacherId
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
      chapter: {
        subject: {
          course: {
            enrollments: {
              some: {
                studentId
              }
            }
          }
        }
      }
    };
  }

  return { ...where, id: -1 };
};

export const listNotes = async (
  actor: { userId: number; role: string },
  query: NoteListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.chapterId === "number") {
    baseWhere.chapterId = query.chapterId;
  }

  if (query.status) {
    baseWhere.status = query.status;
  }

  if (query.search) {
    const term = query.search.trim();
    baseWhere.OR = [
      { title: { contains: term } },
      { description: { contains: term } },
      { content: { contains: term } }
    ];
  }

  const where = await applyRoleFilter(actor.role, actor.userId, baseWhere);

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      select: noteSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ order: "asc" }, { id: "asc" }]
    }),
    prisma.note.count({ where })
  ]);

  return {
    data: notes,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getNoteById = async (
  actor: { userId: number; role: string },
  noteId: number
) => {
  const where = await applyRoleFilter(actor.role, actor.userId, { id: noteId });

  const note = await prisma.note.findFirst({
    where,
    select: noteSelect
  });

  if (!note) {
    throw new Error("Note not found or access denied");
  }

  return note;
};

export const createNote = async (
  actor: { userId: number; role: string },
  input: CreateNoteInput
) => {
  const chapter = await prisma.chapter.findUnique({
    where: { id: input.chapterId },
    select: { id: true, subjectId: true }
  });

  if (!chapter) {
    throw new Error("Chapter not found");
  }

  if (actor.role === "TEACHER") {
    const isAssigned = await verifyTeacherAssignment(actor.userId, chapter.id);

    if (!isAssigned) {
      throw new Error("You are not assigned to this chapter's subject");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to create notes");
  }

  const note = await prisma.note.create({
    data: {
      chapterId: input.chapterId,
      title: input.title,
      description: input.description ?? null,
      fileUrl: input.fileUrl ?? null,
      content: input.content ?? null,
      order: input.order,
      status: input.status
    },
    select: noteSelect
  });

  return note;
};

export const updateNote = async (
  actor: { userId: number; role: string },
  noteId: number,
  input: UpdateNoteInput
) => {
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    select: { id: true, chapterId: true }
  });

  if (!existing) {
    throw new Error("Note not found");
  }

  if (actor.role === "TEACHER") {
    const isAssigned = await verifyTeacherAssignment(actor.userId, existing.chapterId);

    if (!isAssigned) {
      throw new Error("You are not assigned to this chapter's subject");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to update notes");
  }

  const data: {
    title?: string;
    description?: string | null;
    fileUrl?: string | null;
    content?: string | null;
    order?: number;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  } = {};

  if (input.title) data.title = input.title;
  if (typeof input.description !== "undefined") data.description = input.description;
  if (typeof input.fileUrl !== "undefined") data.fileUrl = input.fileUrl;
  if (typeof input.content !== "undefined") data.content = input.content;
  if (typeof input.order !== "undefined") data.order = input.order;
  if (input.status) data.status = input.status;

  const note = await prisma.note.update({
    where: { id: noteId },
    data,
    select: noteSelect
  });

  return note;
};

export const deleteNote = async (
  actor: { userId: number; role: string },
  noteId: number
) => {
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    select: { id: true, chapterId: true }
  });

  if (!existing) {
    throw new Error("Note not found");
  }

  if (actor.role === "TEACHER") {
    const isAssigned = await verifyTeacherAssignment(actor.userId, existing.chapterId);

    if (!isAssigned) {
      throw new Error("You are not assigned to this chapter's subject");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to delete notes");
  }

  await prisma.note.delete({
    where: { id: noteId }
  });

  return { success: true, message: "Note deleted successfully" };
};
