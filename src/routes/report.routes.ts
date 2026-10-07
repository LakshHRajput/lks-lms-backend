import { Router } from "express";

import {
	getAssessmentReports,
	getLmsOverview,
	exportAssessmentReports
} from "../controllers/report.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/overview", authenticate, getLmsOverview);
router.get("/assessments/export.csv", authenticate, exportAssessmentReports);
router.get("/assessments", authenticate, getAssessmentReports);

export default router;