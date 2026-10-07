import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createChapter,
  deleteChapter,
  getChapterById,
  listChapters,
  updateChapter
} from "../services/chapter.service.js";
import {
  chapterListQuerySchema,
  createChapterSchema,
  updateChapterSchema
} from "../validations/chapter.validation.js";

export const getChapters = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = chapterListQuerySchema.parse(req.query);
  const result = await listChapters(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Chapters fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getChapter = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const chapterId = Number(req.params.id);
  const chapter = await getChapterById(req.user, chapterId);

  return res.status(200).json({
    success: true,
    message: "Chapter fetched successfully",
    data: chapter
  });
};

export const createNewChapter = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createChapterSchema.parse(req.body);
  const chapter = await createChapter(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Chapter created successfully",
    data: chapter
  });
};

export const updateChapterById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const chapterId = Number(req.params.id);
  const input = updateChapterSchema.parse(req.body);
  const chapter = await updateChapter(req.user, chapterId, input);

  return res.status(200).json({
    success: true,
    message: "Chapter updated successfully",
    data: chapter
  });
};

export const deleteChapterById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const chapterId = Number(req.params.id);
  const result = await deleteChapter(req.user, chapterId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
