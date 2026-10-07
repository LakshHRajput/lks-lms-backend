import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import attemptRoutes from "./routes/attempt.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import chapterRoutes from "./routes/chapter.routes.js";
import courseRoutes from "./routes/course.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import feeRoutes from "./routes/fee.routes.js";
import noteRoutes from "./routes/note.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import questionRoutes from "./routes/question.routes.js";
import reportRoutes from "./routes/report.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import teacherSubjectRoutes from "./routes/teacher-subject.routes.js";
import testRoutes from "./routes/test.routes.js";
import userRoutes from "./routes/user.routes.js";
import videoRoutes from "./routes/video.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

import { env } from "./config/env.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "LKS LMS Backend is running",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/v1", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "LKS LMS API",
    version: "v1"
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/attempts", attemptRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/subjects", subjectRoutes);
app.use("/api/v1/chapters", chapterRoutes);
app.use("/api/v1/videos", videoRoutes);
app.use("/api/v1/notes", noteRoutes);
app.use("/api/v1/fees", feeRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/tests", testRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/teacher-subjects", teacherSubjectRoutes);
app.use("/api/v1/enrollments", enrollmentRoutes);

app.use(errorMiddleware);


export default app;