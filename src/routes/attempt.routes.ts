import { Router } from "express";

import {
  gradeAttempt,
  getAttemptById,
  getAttempts,
  saveAnswers,
  submitTestAttempt
} from "../controllers/attempt.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getAttempts);
router.get("/:id", authenticate, getAttemptById);
router.put("/:id/answers", authenticate, saveAnswers);
router.post("/:id/submit", authenticate, submitTestAttempt);
router.patch("/:id/grades", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), gradeAttempt);

export default router;