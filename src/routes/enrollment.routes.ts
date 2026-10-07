import { Router } from "express";

import {
  createNewEnrollment,
  deleteEnrollmentById,
  getEnrollment,
  getEnrollments
} from "../controllers/enrollment.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getEnrollments);
router.get("/:id", authenticate, getEnrollment);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN", "STUDENT"), createNewEnrollment);
router.delete("/:id", authenticate, deleteEnrollmentById);

export default router;
