import { Router } from "express";

import {
  changePasswordController,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register
} from "../controllers/auth.controller.js";

import {
  authenticate
} from "../middlewares/auth.middleware.js";

const router = Router();

// =====================================================
// PUBLIC AUTH ROUTES
// =====================================================

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// =====================================================
// PROTECTED AUTH ROUTES
// =====================================================

router.get("/me", authenticate, me);
router.post("/logout-all", authenticate, logoutAll);
router.post("/change-password", authenticate, changePasswordController);

export default router;