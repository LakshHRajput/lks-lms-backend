import { Router } from "express";

import {
  createNewFee,
  deleteFeeById,
  getFee,
  getFees,
  updateFeeById
} from "../controllers/fee.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getFees);
router.get("/:id", authenticate, getFee);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN"), createNewFee);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), updateFeeById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), deleteFeeById);

export default router;
