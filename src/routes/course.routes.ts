import { Router } from "express";

import {
  createNewCourse,
  deleteCourseById,
  getCourse,
  getCourses,
  updateCourseById
} from "../controllers/course.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getCourses);
router.get("/:id", authenticate, getCourse);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN"), createNewCourse);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), updateCourseById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), deleteCourseById);

export default router;
