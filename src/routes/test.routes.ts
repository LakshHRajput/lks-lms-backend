import { Router } from "express";

import {
  createNewTest,
  deleteTestById,
  getTest,
  getTests,
  updateTestById
} from "../controllers/test.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";
import {
  createNewQuestionForTest,
  getQuestionsByTest
} from "../controllers/question.controller.js";
import { startTestAttempt } from "../controllers/attempt.controller.js";

const router = Router();

router.get("/", authenticate, getTests);
router.get("/:id", authenticate, getTest);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), createNewTest);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), updateTestById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), deleteTestById);
router.get("/:id/questions", authenticate, getQuestionsByTest);
router.post("/:id/attempts", authenticate, authorize("STUDENT"), startTestAttempt);
router.post(
  "/:id/questions",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN", "TEACHER"),
  createNewQuestionForTest
);

export default router;
