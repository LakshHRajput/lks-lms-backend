import { Router } from "express";

import {
  createTeacherSubject,
  deleteTeacherSubject,
  getTeacherSubjects
} from "../controllers/teacher-subject.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getTeacherSubjects);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN"), createTeacherSubject);
router.delete("/:subjectId/:teacherId", authenticate, authorize("ADMIN", "SUPER_ADMIN"), deleteTeacherSubject);

export default router;
