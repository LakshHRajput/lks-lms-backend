import { Router } from "express";

import {
  createNewPayment,
  deletePaymentById,
  getPayment,
  getPayments,
  updatePaymentById
} from "../controllers/payment.controller.js";
import {
  authenticate,
  authorize
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getPayments);
router.get("/:id", authenticate, getPayment);
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN", "STUDENT"), createNewPayment);
router.patch("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), updatePaymentById);
router.delete("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), deletePaymentById);

export default router;
