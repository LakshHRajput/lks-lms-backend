import { Router } from "express";

import {
  createNewUser,
  deleteUserById,
  getUser,
  getUsers,
  updateUserById
} from "../controllers/user.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, authorize("ADMIN", "SUPER_ADMIN"), getUsers);
router.get("/:id", authenticate, getUser);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN"), createNewUser);
router.patch("/:id", authenticate, updateUserById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), deleteUserById);

export default router;
