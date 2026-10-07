import { Router } from "express";

import {
  createNewVideo,
  deleteVideoById,
  getVideo,
  getVideos,
  updateVideoById
} from "../controllers/video.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getVideos);
router.get("/:id", authenticate, getVideo);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), createNewVideo);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), updateVideoById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), deleteVideoById);

export default router;
