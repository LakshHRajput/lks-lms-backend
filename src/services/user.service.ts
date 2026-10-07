import prisma from "../config/database.js";
import { UserRole } from "../generated/prisma/enums.js";
import { hashPassword } from "../utils/password.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListQueryInput
} from "../validations/user.validation.js";

type UserRoleName = (typeof UserRole)[keyof typeof UserRole];

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  isActive: true,
  avatar: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} as const;

const roleOrder = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  TEACHER: 3,
  STUDENT: 2,
  PARENT: 1
} as const;

const normalizeAllowedRole = (role: string) => {
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return role;
  }

  return role;
};

const canActorManageTarget = (actorRole: string, targetRole: string) => {
  if (actorRole === "SUPER_ADMIN") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return targetRole !== "SUPER_ADMIN" && targetRole !== "ADMIN";
  }

  return false;
};

const canActorAccessUser = async (
  actorUserId: number,
  actorRole: string,
  targetUserId: number
) => {
  if (actorUserId === targetUserId) {
    return true;
  }

  if (actorRole === "SUPER_ADMIN") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return true;
  }

  if (actorRole === "PARENT") {
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: actorUserId },
      select: { id: true }
    });

    if (!parentProfile) {
      return false;
    }

    const linkedChild = await prisma.parentStudent.findFirst({
      where: {
        parentId: parentProfile.id,
        student: {
          userId: targetUserId
        }
      },
      select: { id: true }
    });

    return Boolean(linkedChild);
  }

  return false;
};

const ensureRoleAuthorization = (actorRole: string, requestedRole: string) => {
  if (actorRole === "SUPER_ADMIN") {
    return;
  }

  if (actorRole === "ADMIN") {
    if (requestedRole === "SUPER_ADMIN" || requestedRole === "ADMIN") {
      throw new Error("Admin users cannot assign admin-level roles");
    }
    return;
  }

  throw new Error("You do not have permission to manage user roles");
};

export const listUsers = async (
  actor: { userId: number; role: string },
  query: UserListQueryInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to list users");
  }

  const where: Record<string, unknown> = {};

  if (query.role) {
    where.role = query.role;
  }

  if (typeof query.isActive === "boolean") {
    where.isActive = query.isActive;
  }

  if (query.search) {
    const searchValue = query.search.trim();
    where.OR = [
      { name: { contains: searchValue } },
      { email: { contains: searchValue } },
      { phone: { contains: searchValue } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.count({ where })
  ]);

  return {
    data: users,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getUserById = async (
  actor: { userId: number; role: string },
  userId: number
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect
  });

  if (!user) {
    throw new Error("User not found");
  }

  const canAccess = await canActorAccessUser(actor.userId, actor.role, user.id);

  if (!canAccess) {
    if (!canActorManageTarget(actor.role, user.role)) {
      throw new Error("You do not have permission to view this user");
    }
  }

  return user;
};

export const createUser = async (
  actor: { userId: number; role: string },
  input: CreateUserInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to create users");
  }

  const requestedRole = normalizeAllowedRole(input.role) as UserRoleName;
  ensureRoleAuthorization(actor.role, requestedRole);

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: requestedRole,
      phone: input.phone,
      isActive: input.isActive
    },
    select: userSelect
  });

  return user;
};

export const updateUser = async (
  actor: { userId: number; role: string },
  userId: number,
  input: UpdateUserInput
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error("User not found");
  }

  const canAccess = await canActorAccessUser(actor.userId, actor.role, userId);

  if (!canAccess && !canActorManageTarget(actor.role, user.role)) {
    throw new Error("You do not have permission to update this user");
  }

  if (input.role) {
    const nextRole = input.role as UserRoleName;
    ensureRoleAuthorization(actor.role, nextRole);
  }

  if (actor.role === "ADMIN" && user.role === "ADMIN") {
    throw new Error("Admin users cannot update another admin account");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.email && { email: input.email }),
      ...(typeof input.phone !== "undefined" && { phone: input.phone }),
      ...(input.role && { role: input.role as UserRoleName }),
      ...(typeof input.isActive === "boolean" && { isActive: input.isActive })
    },
    select: userSelect
  });

  return updatedUser;
};

export const deleteUser = async (
  actor: { userId: number; role: string },
  userId: number
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!canActorManageTarget(actor.role, user.role)) {
    throw new Error("You do not have permission to delete this user");
  }

  if (actor.role === "ADMIN" && user.role === "ADMIN") {
    throw new Error("Admin users cannot delete another admin account");
  }

  await prisma.user.delete({
    where: { id: userId }
  });

  return { success: true, message: "User deleted successfully" };
};

export const getUserStats = async () => {
  const [totalUsers, totalStudents, totalTeachers, totalParents] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "PARENT" } })
  ]);

  return {
    totalUsers,
    totalStudents,
    totalTeachers,
    totalParents
  };
};
