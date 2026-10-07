import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createVideo,
  deleteVideo,
  getVideoById,
  listVideos,
  updateVideo
} from "../services/video.service.js";
import {
  createVideoSchema,
  updateVideoSchema,
  videoListQuerySchema
} from "../validations/video.validation.js";

export const getVideos = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = videoListQuerySchema.parse(req.query);
  const result = await listVideos(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Videos fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getVideo = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const videoId = Number(req.params.id);
  const video = await getVideoById(req.user, videoId);

  return res.status(200).json({
    success: true,
    message: "Video fetched successfully",
    data: video
  });
};

export const createNewVideo = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createVideoSchema.parse(req.body);
  const video = await createVideo(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Video created successfully",
    data: video
  });
};

export const updateVideoById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const videoId = Number(req.params.id);
  const input = updateVideoSchema.parse(req.body);
  const video = await updateVideo(req.user, videoId, input);

  return res.status(200).json({
    success: true,
    message: "Video updated successfully",
    data: video
  });
};

export const deleteVideoById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const videoId = Number(req.params.id);
  const result = await deleteVideo(req.user, videoId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
