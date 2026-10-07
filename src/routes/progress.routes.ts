import { Router } from "express";

import {
  createOrUpdateProgress,
  deleteProgressById,
  getProgress,
  getProgressEntry,
  getProgressSummaryReport,
  updateProgressById
} from "../controllers/progress.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/summary", authenticate, getProgressSummaryReport);
router.get("/", authenticate, getProgress);
router.get("/:id", authenticate, getProgressEntry);
router.post("/", authenticate, authorize("STUDENT", "ADMIN", "SUPER_ADMIN", "TEACHER"), createOrUpdateProgress);
router.patch("/:id", authenticate, authorize("STUDENT", "ADMIN", "SUPER_ADMIN", "TEACHER"), updateProgressById);
router.delete("/:id", authenticate, authorize("STUDENT", "ADMIN", "SUPER_ADMIN"), deleteProgressById);

export default router;
