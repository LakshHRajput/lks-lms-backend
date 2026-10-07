import { Router } from "express";

import {
  deleteQuestionById,
  getQuestion,
  updateQuestionById
} from "../controllers/question.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/:id", authenticate, getQuestion);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), updateQuestionById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), deleteQuestionById);

export default router;
