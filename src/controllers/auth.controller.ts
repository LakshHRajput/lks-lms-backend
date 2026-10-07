import type {
  Request,
  Response
} from "express";

import { env } from "../config/env.js";

import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutAllUserSessions,
  logoutUser,
  refreshAccessToken,
  registerUser
} from "../services/auth.service.js";

import type {
  AuthenticatedRequest
} from "../middlewares/auth.middleware.js";

import {
  changePasswordSchema,
  loginSchema,
  registerSchema
} from "../validations/auth.validation.js";

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const getRefreshTokenFromRequest = (req: Request): string | null => {
  const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken.trim() : "";

  if (bodyToken) {
    return bodyToken;
  }

  const cookieHeader = req.headers.cookie ?? "";

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...rest] = cookie.trim().split("=");

    if (name === "refreshToken") {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
};

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  const isProduction = env.NODE_ENV === "production";

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE
  });
};

const clearRefreshTokenCookie = (res: Response) => {
  const isProduction = env.NODE_ENV === "production";

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/"
  });
};

// =====================================================
// REGISTER
// =====================================================

export const register = async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const user = await registerUser(input);

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: user
  });
};

// =====================================================
// LOGIN
// =====================================================

export const login = async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await loginUser(input);

  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: result
  });
};

// =====================================================
// REFRESH TOKEN
// =====================================================

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required"
    });
  }

  const result = await refreshAccessToken(refreshToken);

  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(200).json({
    success: true,
    message: "Access token refreshed successfully",
    data: result
  });
};

// =====================================================
// LOGOUT
// =====================================================

export const logout = async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required"
    });
  }

  await logoutUser(refreshToken);
  clearRefreshTokenCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logout successful"
  });
};

export const logoutAll = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  await logoutAllUserSessions(req.user.userId);
  clearRefreshTokenCookie(res);

  return res.status(200).json({
    success: true,
    message: "All sessions logged out successfully"
  });
};

export const changePasswordController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = changePasswordSchema.parse(req.body);
  const result = await changePassword(req.user.userId, input);

  clearRefreshTokenCookie(res);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};

// =====================================================
// CURRENT USER
// =====================================================

export const me = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const user = await getCurrentUser(req.user.userId);

  return res.status(200).json({
    success: true,
    message: "Current user fetched successfully",
    data: user
  });
};