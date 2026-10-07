import prisma from "../config/database.js";
import type {
  CreateVideoInput,
  UpdateVideoInput,
  VideoListQueryInput
} from "../validations/video.validation.js";

const videoSelect = {
  id: true,
  chapterId: true,
  title: true,
  description: true,
  videoUrl: true,
  thumbnail: true,
  duration: true,
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

export const listVideos = async (
  actor: { userId: number; role: string },
  query: VideoListQueryInput
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
      { videoUrl: { contains: term } }
    ];
  }

  const where = await applyRoleFilter(actor.role, actor.userId, baseWhere);

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      select: videoSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ order: "asc" }, { id: "asc" }]
    }),
    prisma.video.count({ where })
  ]);

  return {
    data: videos,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getVideoById = async (
  actor: { userId: number; role: string },
  videoId: number
) => {
  const where = await applyRoleFilter(actor.role, actor.userId, { id: videoId });

  const video = await prisma.video.findFirst({
    where,
    select: videoSelect
  });

  if (!video) {
    throw new Error("Video not found or access denied");
  }

  return video;
};

export const createVideo = async (
  actor: { userId: number; role: string },
  input: CreateVideoInput
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
    throw new Error("You do not have permission to create videos");
  }

  const video = await prisma.video.create({
    data: {
      chapterId: input.chapterId,
      title: input.title,
      description: input.description ?? null,
      videoUrl: input.videoUrl,
      thumbnail: input.thumbnail ?? null,
      duration: input.duration ?? null,
      order: input.order,
      status: input.status
    },
    select: videoSelect
  });

  return video;
};

export const updateVideo = async (
  actor: { userId: number; role: string },
  videoId: number,
  input: UpdateVideoInput
) => {
  const existing = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, chapterId: true }
  });

  if (!existing) {
    throw new Error("Video not found");
  }

  if (actor.role === "TEACHER") {
    const isAssigned = await verifyTeacherAssignment(actor.userId, existing.chapterId);

    if (!isAssigned) {
      throw new Error("You are not assigned to this chapter's subject");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to update videos");
  }

  const data: {
    title?: string;
    description?: string | null;
    videoUrl?: string;
    thumbnail?: string | null;
    duration?: number | null;
    order?: number;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  } = {};

  if (input.title) data.title = input.title;
  if (typeof input.description !== "undefined") data.description = input.description;
  if (input.videoUrl) data.videoUrl = input.videoUrl;
  if (typeof input.thumbnail !== "undefined") data.thumbnail = input.thumbnail;
  if (typeof input.duration !== "undefined") data.duration = input.duration;
  if (typeof input.order !== "undefined") data.order = input.order;
  if (input.status) data.status = input.status;

  const video = await prisma.video.update({
    where: { id: videoId },
    data,
    select: videoSelect
  });

  return video;
};

export const deleteVideo = async (
  actor: { userId: number; role: string },
  videoId: number
) => {
  const existing = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, chapterId: true }
  });

  if (!existing) {
    throw new Error("Video not found");
  }

  if (actor.role === "TEACHER") {
    const isAssigned = await verifyTeacherAssignment(actor.userId, existing.chapterId);

    if (!isAssigned) {
      throw new Error("You are not assigned to this chapter's subject");
    }
  } else if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to delete videos");
  }

  await prisma.video.delete({
    where: { id: videoId }
  });

  return { success: true, message: "Video deleted successfully" };
};
