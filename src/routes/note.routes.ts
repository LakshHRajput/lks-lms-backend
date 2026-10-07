import { Router } from "express";

import {
  createNewNote,
  deleteNoteById,
  getNote,
  getNotes,
  updateNoteById
} from "../controllers/note.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getNotes);
router.get("/:id", authenticate, getNote);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), createNewNote);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), updateNoteById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), deleteNoteById);

export default router;
