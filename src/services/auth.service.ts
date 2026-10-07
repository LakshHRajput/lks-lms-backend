import crypto from "node:crypto";

import prisma from "../config/database.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from "../utils/jwt.js";

import {
  comparePassword,
  hashPassword
} from "../utils/password.js";

import { hashRefreshToken } from "../utils/refresh-token.js";
import { HttpError } from "../utils/http-error.js";

import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput
} from "../validations/auth.validation.js";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createFreshRefreshTokenRecord = async (userId: number) => {
  const temporaryHash = `pending_${crypto.randomBytes(32).toString("hex")}`;

  return prisma.refreshToken.create({
    data: {
      tokenHash: temporaryHash,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    }
  });
};

const revokeAllUserRefreshTokens = async (userId: number) => {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
};

// =====================================================
// REGISTER
// =====================================================

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email
    }
  });

  if (existingUser) {
    throw new HttpError("User with this email already exists", 409);
  }

  const normalizedRole = input.role ?? "STUDENT";

  if (normalizedRole !== "STUDENT") {
    throw new HttpError("Public registration is restricted to STUDENT role", 403);
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      phone: input.phone,
      role: normalizedRole,
      studentProfile: {
        create: {
          studentCode: `LKS-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
          admissionDate: new Date()
        }
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true
    }
  });

  return user;
};

// =====================================================
// LOGIN
// =====================================================

export const loginUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email
    }
  });

  if (!user) {
    throw new HttpError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new HttpError("Your account is inactive", 403);
  }

  const passwordMatch = await comparePassword(input.password, user.password);

  if (!passwordMatch) {
    throw new HttpError("Invalid email or password", 401);
  }

  const refreshTokenRecord = await createFreshRefreshTokenRecord(user.id);

  const refreshToken = generateRefreshToken({
    userId: user.id,
    tokenId: refreshTokenRecord.id
  });

  const refreshTokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.update({
    where: {
      id: refreshTokenRecord.id
    },
    data: {
      tokenHash: refreshTokenHash
    }
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role
  });

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      lastLoginAt: new Date()
    }
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    },
    accessToken,
    refreshToken
  };
};

// =====================================================
// REFRESH ACCESS TOKEN
// =====================================================

export const refreshAccessToken = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: {
      id: payload.tokenId
    }
  });

  if (!tokenRecord) {
    throw new HttpError("Refresh token is invalid", 401);
  }

  if (tokenRecord.userId !== payload.userId) {
    throw new HttpError("Refresh token is invalid", 401);
  }

  const incomingTokenHash = hashRefreshToken(refreshToken);

  if (tokenRecord.revokedAt || tokenRecord.tokenHash !== incomingTokenHash) {
    await revokeAllUserRefreshTokens(payload.userId);
    throw new HttpError("Refresh token reuse detected. All active sessions have been revoked", 401);
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.refreshToken.update({
      where: {
        id: tokenRecord.id
      },
      data: {
        revokedAt: new Date()
      }
    });

    throw new HttpError("Refresh token has expired", 401);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId
    }
  });

  if (!user) {
    throw new HttpError("User not found", 404);
  }

  if (!user.isActive) {
    throw new HttpError("Your account is inactive", 403);
  }

  await prisma.refreshToken.update({
    where: {
      id: tokenRecord.id
    },
    data: {
      revokedAt: new Date()
    }
  });

  const newRefreshTokenRecord = await createFreshRefreshTokenRecord(user.id);

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role
  });

  const newRefreshToken = generateRefreshToken({
    userId: user.id,
    tokenId: newRefreshTokenRecord.id
  });

  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  await prisma.refreshToken.update({
    where: {
      id: newRefreshTokenRecord.id
    },
    data: {
      tokenHash: newRefreshTokenHash
    }
  });

  return {
    accessToken,
    refreshToken: newRefreshToken
  };
};

// =====================================================
// LOGOUT
// =====================================================

export const logoutUser = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: {
      id: payload.tokenId
    }
  });

  if (!tokenRecord || tokenRecord.userId !== payload.userId) {
    return;
  }

  const incomingTokenHash = hashRefreshToken(refreshToken);

  if (tokenRecord.tokenHash !== incomingTokenHash) {
    await revokeAllUserRefreshTokens(payload.userId);
    return;
  }

  await prisma.refreshToken.update({
    where: {
      id: tokenRecord.id
    },
    data: {
      revokedAt: new Date()
    }
  });
};

export const logoutAllUserSessions = async (userId: number) => {
  await revokeAllUserRefreshTokens(userId);
};

export const changePassword = async (
  userId: number,
  input: ChangePasswordInput
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw new Error("User not found");
  }

  const currentPasswordValid = await comparePassword(
    input.currentPassword,
    user.password
  );

  if (!currentPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  if (input.currentPassword === input.newPassword) {
    throw new Error("New password must be different from your current password");
  }

  const hashedPassword = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      password: hashedPassword
    }
  });

  await revokeAllUserRefreshTokens(userId);

  return {
    success: true,
    message: "Password updated successfully"
  };
};

// =====================================================
// GET CURRENT USER
// =====================================================

export const getCurrentUser = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true
    }
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.isActive) {
    throw new Error("Your account is inactive");
  }

  return user;
};