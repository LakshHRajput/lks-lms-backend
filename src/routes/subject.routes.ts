import { Router } from "express";

import {
  createNewSubject,
  deleteSubjectById,
  getSubject,
  getSubjects,
  updateSubjectById
} from "../controllers/subject.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getSubjects);
router.get("/:id", authenticate, getSubject);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN"), createNewSubject);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), updateSubjectById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), deleteSubjectById);

export default router;
