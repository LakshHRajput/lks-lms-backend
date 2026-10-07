import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createTest,
  deleteTest,
  getTestById,
  listTests,
  updateTest
} from "../services/test.service.js";
import {
  createTestSchema,
  testListQuerySchema,
  updateTestSchema
} from "../validations/test.validation.js";

export const getTests = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = testListQuerySchema.parse(req.query);
  const result = await listTests(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Tests fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getTest = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const testId = Number(req.params.id);
  const test = await getTestById(req.user, testId);

  return res.status(200).json({
    success: true,
    message: "Test fetched successfully",
    data: test
  });
};

export const createNewTest = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createTestSchema.parse(req.body);
  const test = await createTest(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Test created successfully",
    data: test
  });
};

export const updateTestById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const testId = Number(req.params.id);
  const input = updateTestSchema.parse(req.body);
  const test = await updateTest(req.user, testId, input);

  return res.status(200).json({
    success: true,
    message: "Test updated successfully",
    data: test
  });
};

export const deleteTestById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const testId = Number(req.params.id);
  const result = await deleteTest(req.user, testId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
