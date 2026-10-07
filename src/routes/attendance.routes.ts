import { Router } from "express";

import {
  createNewAttendance,
  deleteAttendanceById,
  getAttendance,
  getAttendances,
  updateAttendanceById
} from "../controllers/attendance.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getAttendances);
router.get("/:id", authenticate, getAttendance);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), createNewAttendance);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), updateAttendanceById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), deleteAttendanceById);

export default router;
