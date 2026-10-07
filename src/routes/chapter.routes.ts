import { Router } from "express";

import {
  createNewChapter,
  deleteChapterById,
  getChapter,
  getChapters,
  updateChapterById
} from "../controllers/chapter.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getChapters);
router.get("/:id", authenticate, getChapter);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), createNewChapter);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), updateChapterById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), deleteChapterById);

export default router;
