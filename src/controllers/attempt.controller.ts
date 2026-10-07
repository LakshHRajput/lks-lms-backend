import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  gradeAttemptAnswers as gradeAttemptAnswersService,
  getAttempt,
  listAttempts,
  saveAttemptAnswers,
  startAttempt,
  submitAttempt
} from "../services/attempt.service.js";
import {
  attemptListQuerySchema,
  gradeAttemptAnswersSchema,
  saveAttemptAnswersSchema
} from "../validations/attempt.validation.js";

export const startTestAttempt = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const attempt = await startAttempt(req.user, Number(req.params.id));
  return res.status(201).json({ success: true, message: "Test attempt started", data: attempt });
};

export const getAttemptById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const attempt = await getAttempt(req.user, Number(req.params.id));
  return res.status(200).json({ success: true, message: "Attempt fetched successfully", data: attempt });
};

export const getAttempts = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const query = attemptListQuerySchema.parse(req.query);
  const result = await listAttempts(req.user, query);
  return res.status(200).json({
    success: true,
    message: "Attempts fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const saveAnswers = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const input = saveAttemptAnswersSchema.parse(req.body);
  const attempt = await saveAttemptAnswers(req.user, Number(req.params.id), input);
  return res.status(200).json({ success: true, message: "Answers saved successfully", data: attempt });
};

export const submitTestAttempt = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const attempt = await submitAttempt(req.user, Number(req.params.id));
  return res.status(200).json({ success: true, message: "Attempt submitted successfully", data: attempt });
};

export const gradeAttempt = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const input = gradeAttemptAnswersSchema.parse(req.body);
  const attempt = await gradeAttemptAnswersService(req.user, Number(req.params.id), input);
  return res.status(200).json({ success: true, message: "Subjective answers graded successfully", data: attempt });
};