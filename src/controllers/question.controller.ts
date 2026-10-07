import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  listQuestions,
  updateQuestion
} from "../services/question.service.js";
import {
  createQuestionSchema,
  questionListQuerySchema,
  updateQuestionSchema
} from "../validations/question.validation.js";

export const getQuestionsByTest = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const testId = Number(req.params.id);
  const query = questionListQuerySchema.parse(req.query);
  const result = await listQuestions(req.user, testId, query);

  return res.status(200).json({
    success: true,
    message: "Questions fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getQuestion = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const questionId = Number(req.params.id);
  const question = await getQuestionById(req.user, questionId);

  return res.status(200).json({
    success: true,
    message: "Question fetched successfully",
    data: question
  });
};

export const createNewQuestionForTest = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const testId = Number(req.params.id);
  const input = createQuestionSchema.parse(req.body);
  const question = await createQuestion(req.user, testId, input);

  return res.status(201).json({
    success: true,
    message: "Question created successfully",
    data: question
  });
};

export const updateQuestionById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const questionId = Number(req.params.id);
  const input = updateQuestionSchema.parse(req.body);
  const question = await updateQuestion(req.user, questionId, input);

  return res.status(200).json({
    success: true,
    message: "Question updated successfully",
    data: question
  });
};

export const deleteQuestionById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const questionId = Number(req.params.id);
  const result = await deleteQuestion(req.user, questionId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
