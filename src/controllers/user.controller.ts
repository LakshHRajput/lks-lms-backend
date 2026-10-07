import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser
} from "../services/user.service.js";
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema
} from "../validations/user.validation.js";

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = userListQuerySchema.parse(req.query);
  const result = await listUsers(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getUser = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const userId = Number(req.params.id);
  const user = await getUserById(req.user, userId);

  return res.status(200).json({
    success: true,
    message: "User fetched successfully",
    data: user
  });
};

export const createNewUser = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createUserSchema.parse(req.body);
  const user = await createUser(req.user, input);

  return res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user
  });
};

export const updateUserById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const userId = Number(req.params.id);
  const input = updateUserSchema.parse(req.body);
  const user = await updateUser(req.user, userId, input);

  return res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: user
  });
};

export const deleteUserById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const userId = Number(req.params.id);
  const result = await deleteUser(req.user, userId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
