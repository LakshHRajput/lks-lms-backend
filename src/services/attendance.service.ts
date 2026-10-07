import prisma from "../config/database.js";
import type {
  AttendanceListQueryInput,
  CreateAttendanceInput,
  UpdateAttendanceInput
} from "../validations/attendance.validation.js";

const attendanceSelect = {
  id: true,
  studentId: true,
  markedById: true,
  date: true,
  status: true,
  remarks: true,
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
  markedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
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

const normalizeDate = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const listAttendances = async (
  actor: { userId: number; role: string },
  query: AttendanceListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.studentId === "number") {
    baseWhere.studentId = query.studentId;
  }

  if (query.status) {
    baseWhere.status = query.status;
  }

  if (query.date) {
    const targetDate = normalizeDate(query.date);
    baseWhere.date = {
      gte: new Date(targetDate),
      lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
    };
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

  const [attendances, total] = await Promise.all([
    prisma.attendance.findMany({
      where: baseWhere,
      select: attendanceSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ date: "desc" }, { id: "desc" }]
    }),
    prisma.attendance.count({ where: baseWhere })
  ]);

  return {
    data: attendances,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getAttendanceById = async (
  actor: { userId: number; role: string },
  attendanceId: number
) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: attendanceSelect
  });

  if (!attendance) {
    throw new Error("Attendance record not found");
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId || attendance.studentId !== studentId) {
      throw new Error("Attendance record not found or access denied");
    }
  }

  return attendance;
};

export const markAttendance = async (
  actor: { userId: number; role: string },
  input: CreateAttendanceInput
) => {
  if (!["SUPER_ADMIN", "ADMIN", "TEACHER"].includes(actor.role)) {
    throw new Error("You do not have permission to mark attendance");
  }

  const attendanceDate = normalizeDate(input.date);

  const attendance = await prisma.attendance.upsert({
    where: {
      studentId_date: {
        studentId: input.studentId,
        date: attendanceDate
      }
    },
    update: {
      status: input.status,
      remarks: input.remarks ?? null,
      markedById: actor.userId
    },
    create: {
      studentId: input.studentId,
      markedById: actor.userId,
      date: attendanceDate,
      status: input.status,
      remarks: input.remarks ?? null
    },
    select: attendanceSelect
  });

  return attendance;
};

export const updateAttendance = async (
  actor: { userId: number; role: string },
  attendanceId: number,
  input: UpdateAttendanceInput
) => {
  if (!["SUPER_ADMIN", "ADMIN", "TEACHER"].includes(actor.role)) {
    throw new Error("You do not have permission to update attendance");
  }

  const existing = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { id: true, date: true, studentId: true }
  });

  if (!existing) {
    throw new Error("Attendance record not found");
  }

  const data: {
    studentId?: number;
    date?: Date;
    status?: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
    remarks?: string | null;
    markedById?: number;
  } = {
    ...(input.studentId ? { studentId: input.studentId } : {}),
    ...(input.date ? { date: normalizeDate(input.date) } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(typeof input.remarks !== "undefined" ? { remarks: input.remarks } : {}),
    markedById: actor.userId
  };

  const attendance = await prisma.attendance.update({
    where: { id: attendanceId },
    data,
    select: attendanceSelect
  });

  return attendance;
};

export const deleteAttendance = async (
  actor: { userId: number; role: string },
  attendanceId: number
) => {
  if (!["SUPER_ADMIN", "ADMIN", "TEACHER"].includes(actor.role)) {
    throw new Error("You do not have permission to delete attendance");
  }

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { id: true }
  });

  if (!attendance) {
    throw new Error("Attendance record not found");
  }

  await prisma.attendance.delete({ where: { id: attendanceId } });

  return { message: "Attendance record deleted successfully" };
};
