import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";

import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.js";
import prisma from "../src/config/database.js";
import { generateAccessToken } from "../src/utils/jwt.js";

let server: Server | undefined;
let baseUrl = "";
let adminToken = "";
let studentToken = "";
let otherStudentToken = "";
let teacherToken = "";
let testId = 0;
let subjectId = 0;
let teacherProfileId = 0;
let chapterId = 0;
let questionId = 0;
let subjectiveQuestionId = 0;
let subjectiveAnswerId = 0;
let correctOptionId = 0;
let studentProfileId = 0;
let otherStudentProfileId = 0;
let createdUserIds: number[] = [];
let createdCourseId = 0;
let createdFeeIds: number[] = [];
let attemptId = 0;

type ApiResult = {
  status: number;
  body: Record<string, any>;
};

const apiRequest = async (
  path: string,
  token: string,
  method = "GET",
  body?: unknown
): Promise<ApiResult> => {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  return { status: response.status, body: await response.json() };
};

const publicRequest = async (path: string, method: string, body?: unknown): Promise<ApiResult> => {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
  });

  return { status: response.status, body: await response.json() };
};

const textApiRequest = async (path: string, token: string) => {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    contentDisposition: response.headers.get("content-disposition"),
    body: await response.text()
  };
};

before(async () => {
  await prisma.$connect();
  const suffix = randomUUID().replaceAll("-", "");
  const admin = await prisma.user.create({
    data: {
      name: "Integration Admin",
      email: `integration-admin-${suffix}@example.test`,
      password: "not-used-for-token-auth",
      role: "SUPER_ADMIN"
    },
    select: { id: true }
  });
  createdUserIds.push(admin.id);

  const student = await prisma.user.create({
    data: {
      name: "Integration Student",
      email: `integration-student-${suffix}@example.test`,
      password: "not-used-for-token-auth",
      role: "STUDENT"
    },
    select: { id: true }
  });
  createdUserIds.push(student.id);

  const otherStudent = await prisma.user.create({
    data: {
      name: "Other Integration Student",
      email: `integration-other-${suffix}@example.test`,
      password: "not-used-for-token-auth",
      role: "STUDENT"
    },
    select: { id: true }
  });
  createdUserIds.push(otherStudent.id);

  const teacherUser = await prisma.user.create({
    data: {
      name: "Integration Teacher",
      email: `integration-teacher-${suffix}@example.test`,
      password: "not-used-for-token-auth",
      role: "TEACHER"
    },
    select: { id: true }
  });
  createdUserIds.push(teacherUser.id);

  const teacherProfile = await prisma.teacherProfile.create({
    data: { userId: teacherUser.id, employeeCode: `INT-${suffix.slice(0, 12)}` },
    select: { id: true }
  });
  teacherProfileId = teacherProfile.id;

  const studentProfile = await prisma.studentProfile.create({
    data: { userId: student.id, studentCode: `INT-${suffix.slice(0, 12)}` },
    select: { id: true }
  });
  studentProfileId = studentProfile.id;

  const otherStudentProfile = await prisma.studentProfile.create({
    data: { userId: otherStudent.id, studentCode: `OTR-${suffix.slice(0, 12)}` },
    select: { id: true }
  });
  otherStudentProfileId = otherStudentProfile.id;

  const course = await prisma.course.create({
    data: {
      name: "Integration Course",
      slug: `integration-course-${suffix}`,
      createdById: admin.id
    },
    select: { id: true }
  });
  createdCourseId = course.id;

  const subject = await prisma.subject.create({
    data: {
      courseId: course.id,
      name: "Integration Subject",
      slug: `integration-subject-${suffix}`
    },
    select: { id: true }
  });
  subjectId = subject.id;

  const chapter = await prisma.chapter.create({
    data: {
      subjectId,
      title: "Integration Chapter",
      slug: `integration-chapter-${suffix}`
    },
    select: { id: true }
  });
  chapterId = chapter.id;

  await prisma.teacherSubject.create({
    data: { teacherId: teacherProfile.id, subjectId }
  });

  await prisma.enrollment.create({
    data: { studentId: studentProfile.id, courseId: course.id }
  });

  const exam = await prisma.test.create({
    data: {
      subjectId: subject.id,
      createdById: admin.id,
      title: "Attempt API integration test",
      totalMarks: 9,
      duration: 10,
      status: "PUBLISHED",
      startAt: new Date(Date.now() - 60_000),
      endAt: new Date(Date.now() + 3_600_000)
    },
    select: { id: true }
  });
  testId = exam.id;

  const question = await prisma.question.create({
    data: {
      testId,
      question: "Which option is correct?",
      type: "MCQ",
      marks: 5,
      negativeMarks: 1,
      options: {
        create: [
          { optionText: "Correct option", isCorrect: true },
          { optionText: "Incorrect option", isCorrect: false }
        ]
      }
    },
    select: { id: true, options: { select: { id: true, isCorrect: true } } }
  });
  questionId = question.id;
  correctOptionId = question.options.find((option) => option.isCorrect)!.id;

  const subjectiveQuestion = await prisma.question.create({
    data: {
      testId,
      question: "Explain your reasoning.",
      type: "LONG_ANSWER",
      marks: 4
    },
    select: { id: true }
  });
  subjectiveQuestionId = subjectiveQuestion.id;

  adminToken = generateAccessToken({ userId: admin.id, role: "SUPER_ADMIN" });
  studentToken = generateAccessToken({ userId: student.id, role: "STUDENT" });
  otherStudentToken = generateAccessToken({ userId: otherStudent.id, role: "STUDENT" });
  teacherToken = generateAccessToken({ userId: teacherUser.id, role: "TEACHER" });

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  try {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => error ? reject(error) : resolve());
      });
    }

    if (createdFeeIds.length > 0) {
      await prisma.payment.deleteMany({ where: { feeId: { in: createdFeeIds } } });
      await prisma.fee.deleteMany({ where: { id: { in: createdFeeIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.attendance.deleteMany({ where: { markedById: { in: createdUserIds } } });
    }
    if (createdCourseId) {
      await prisma.course.deleteMany({ where: { id: createdCourseId } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("exam attempt API enforces access, hides answer keys, and persists grading", async (context) => {
  await context.test("public registration and authentication enforce safe token lifecycle", async () => {
    const email = `integration-auth-${randomUUID()}@example.test`;
    const registered = await publicRequest("/auth/register", "POST", {
      name: "Registered Integration Student",
      email,
      password: "IntegrationPass123!"
    });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.data.role, "STUDENT");
    createdUserIds.push(registered.body.data.id);
    const registeredProfile = await prisma.studentProfile.findUnique({
      where: { userId: registered.body.data.id },
      select: { studentCode: true }
    });
    assert.ok(registeredProfile?.studentCode.startsWith("LKS-"));

    const escalated = await publicRequest("/auth/register", "POST", {
      name: "Escalated Integration User",
      email: `integration-escalated-${randomUUID()}@example.test`,
      password: "IntegrationPass123!",
      role: "ADMIN"
    });
    assert.equal(escalated.status, 400);

    const duplicate = await publicRequest("/auth/register", "POST", {
      name: "Duplicate Integration Student",
      email,
      password: "IntegrationPass123!"
    });
    assert.equal(duplicate.status, 409);

    const invalidLogin = await publicRequest("/auth/login", "POST", {
      email,
      password: "wrong-password"
    });
    assert.equal(invalidLogin.status, 401);

    const login = await publicRequest("/auth/login", "POST", {
      email,
      password: "IntegrationPass123!"
    });
    assert.equal(login.status, 200);
    assert.ok(login.body.data.accessToken);
    assert.ok(login.body.data.refreshToken);

    const currentUser = await apiRequest("/auth/me", login.body.data.accessToken);
    assert.equal(currentUser.status, 200);
    assert.equal(currentUser.body.data.email, email);

    const rotated = await publicRequest("/auth/refresh", "POST", {
      refreshToken: login.body.data.refreshToken
    });
    assert.equal(rotated.status, 200);
    assert.notEqual(rotated.body.data.refreshToken, login.body.data.refreshToken);

    const logout = await publicRequest("/auth/logout", "POST", {
      refreshToken: rotated.body.data.refreshToken
    });
    assert.equal(logout.status, 200);

    const revokedRefresh = await publicRequest("/auth/refresh", "POST", {
      refreshToken: rotated.body.data.refreshToken
    });
    assert.equal(revokedRefresh.status, 401);

    const changedPassword = await apiRequest("/auth/change-password", login.body.data.accessToken, "POST", {
      currentPassword: "IntegrationPass123!",
      newPassword: "IntegrationPass456!"
    });
    assert.equal(changedPassword.status, 200);

    const oldPasswordLogin = await publicRequest("/auth/login", "POST", {
      email,
      password: "IntegrationPass123!"
    });
    assert.equal(oldPasswordLogin.status, 401);

    const newPasswordLogin = await publicRequest("/auth/login", "POST", {
      email,
      password: "IntegrationPass456!"
    });
    assert.equal(newPasswordLogin.status, 200);

    const logoutAll = await apiRequest("/auth/logout-all", newPasswordLogin.body.data.accessToken, "POST", {});
    assert.equal(logoutAll.status, 200);
    const revokedSession = await publicRequest("/auth/refresh", "POST", {
      refreshToken: newPasswordLogin.body.data.refreshToken
    });
    assert.equal(revokedSession.status, 401);
  });

  await context.test("questions are unavailable before an attempt starts", async () => {
    const response = await apiRequest(`/tests/${testId}/questions`, studentToken);
    assert.equal(response.status, 403);
  });

  await context.test("enrolled student can start an attempt", async () => {
    const response = await apiRequest(`/tests/${testId}/attempts`, studentToken, "POST", {});
    assert.equal(response.status, 201);
    assert.equal(response.body.data.status, "IN_PROGRESS");
    attemptId = response.body.data.id;
  });

  await context.test("active attempt returns questions without correctness flags", async () => {
    const response = await apiRequest(`/tests/${testId}/questions`, studentToken);
    assert.equal(response.status, 200);
    assert.equal(response.body.data[0].id, questionId);
    assert.equal(Object.hasOwn(response.body.data[0].options[0], "isCorrect"), false);
  });

  await context.test("student can save and submit answers with a persisted score", async () => {
    const saved = await apiRequest(`/attempts/${attemptId}/answers`, studentToken, "PUT", {
      answers: [
        { questionId, selectedOptionId: correctOptionId },
        { questionId: subjectiveQuestionId, answerText: "A written explanation" }
      ]
    });
    assert.equal(saved.status, 200);
    subjectiveAnswerId = saved.body.data.answers.find(
      (answer: { questionId: number }) => answer.questionId === subjectiveQuestionId
    ).id;

    const submitted = await apiRequest(`/attempts/${attemptId}/submit`, studentToken, "POST", {});
    assert.equal(submitted.status, 200);
    assert.equal(submitted.body.data.status, "SUBMITTED");
    assert.equal(submitted.body.data.score, 5);

    const persistedAnswer = await prisma.studentAnswer.findUniqueOrThrow({
      where: { attemptId_questionId: { attemptId, questionId } },
      select: { studentId: true, isCorrect: true, marks: true }
    });
    assert.equal(persistedAnswer.studentId, studentProfileId);
    assert.equal(persistedAnswer.isCorrect, true);
    assert.equal(persistedAnswer.marks, 5);
  });

  await context.test("students cannot grade subjective answers", async () => {
    const response = await apiRequest(`/attempts/${attemptId}/grades`, studentToken, "PATCH", {
      grades: [{ answerId: subjectiveAnswerId, marks: 3 }]
    });
    assert.equal(response.status, 403);
  });

  await context.test("manual grades enforce the question maximum", async () => {
    const response = await apiRequest(`/attempts/${attemptId}/grades`, adminToken, "PATCH", {
      grades: [{ answerId: subjectiveAnswerId, marks: 5 }]
    });
    assert.equal(response.status, 400);
  });

  await context.test("authorized manual grading updates answer and attempt score", async () => {
    const response = await apiRequest(`/attempts/${attemptId}/grades`, adminToken, "PATCH", {
      grades: [{ answerId: subjectiveAnswerId, marks: 3 }]
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.score, 8);

    const gradedAnswer = await prisma.studentAnswer.findUniqueOrThrow({
      where: { id: subjectiveAnswerId },
      select: { isCorrect: true, marks: true }
    });
    assert.equal(gradedAnswer.isCorrect, null);
    assert.equal(gradedAnswer.marks, 3);
  });

  await context.test("another student cannot retrieve the attempt", async () => {
    assert.ok(otherStudentProfileId > 0);
    const response = await apiRequest(`/attempts/${attemptId}`, otherStudentToken);
    assert.equal(response.status, 404);
  });

  await context.test("submitted attempt cannot be started again", async () => {
    const response = await apiRequest(`/tests/${testId}/attempts`, studentToken, "POST", {});
    assert.equal(response.status, 409);
  });

  await context.test("assessment report returns aggregate results for admins", async () => {
    const response = await apiRequest(`/reports/assessments?subjectId=${subjectId}`, adminToken);
    assert.equal(response.status, 200);
    assert.equal(response.body.summary.attempts, 1);
    assert.equal(response.body.data[0].attempts, 1);
    assert.equal(response.body.data[0].submittedAttempts, 1);
    assert.equal(response.body.data[0].averageScore, 8);
    assert.equal(response.body.data[0].averagePercentage, 88.89);
  });

  await context.test("teachers see assessment reports only for assigned subjects", async () => {
    const response = await apiRequest("/reports/assessments", teacherToken);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.map((report: { testId: number }) => report.testId), [testId]);
  });

  await context.test("students cannot access assessment reports", async () => {
    const response = await apiRequest("/reports/assessments", studentToken);
    assert.equal(response.status, 403);
  });

  await context.test("admin overview summarizes LMS activity for a date range", async () => {
    const from = encodeURIComponent(new Date(Date.now() - 60_000).toISOString());
    const to = encodeURIComponent(new Date(Date.now() + 60_000).toISOString());
    const response = await apiRequest(`/reports/overview?from=${from}&to=${to}`, adminToken);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.users.some((item: { role: string }) => item.role === "STUDENT"));
    assert.ok(response.body.data.attempts.some(
      (item: { status: string; count: number }) => item.status === "SUBMITTED" && item.count >= 1
    ));
    assert.equal(typeof response.body.data.fees.outstandingAmount, "number");
    assert.equal(typeof response.body.data.learningProgress.averagePercent, "number");
  });

  await context.test("LMS overview is not available to students or teachers", async () => {
    const [studentResponse, teacherResponse] = await Promise.all([
      apiRequest("/reports/overview", studentToken),
      apiRequest("/reports/overview", teacherToken)
    ]);
    assert.equal(studentResponse.status, 403);
    assert.equal(teacherResponse.status, 403);
  });

  await context.test("attendance is marked by staff and visible only to the student", async () => {
    const date = new Date().toISOString();
    const marked = await apiRequest("/attendance", adminToken, "POST", {
      studentId: studentProfileId,
      date,
      status: "PRESENT",
      remarks: "Integration attendance"
    });
    assert.equal(marked.status, 201);
    assert.equal(marked.body.data.status, "PRESENT");

    const ownRecords = await apiRequest(`/attendance?date=${encodeURIComponent(date)}`, studentToken);
    const otherRecords = await apiRequest(`/attendance?date=${encodeURIComponent(date)}`, otherStudentToken);
    assert.equal(ownRecords.status, 200);
    assert.ok(ownRecords.body.data.some((record: { id: number }) => record.id === marked.body.data.id));
    assert.equal(otherRecords.status, 200);
    assert.equal(otherRecords.body.data.length, 0);

    const forbiddenMark = await apiRequest("/attendance", studentToken, "POST", {
      studentId: studentProfileId,
      date,
      status: "ABSENT"
    });
    assert.equal(forbiddenMark.status, 403);

    const updated = await apiRequest(`/attendance/${marked.body.data.id}`, adminToken, "PATCH", {
      status: "LATE",
      remarks: "Updated integration attendance"
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.status, "LATE");

    const deleted = await apiRequest(`/attendance/${marked.body.data.id}`, adminToken, "DELETE");
    assert.equal(deleted.status, 200);
  });

  await context.test("student payment updates only their fee balance", async () => {
    const createdFee = await apiRequest("/fees", adminToken, "POST", {
      studentId: studentProfileId,
      title: "Integration Tuition Fee",
      amount: 100,
      status: "PENDING"
    });
    assert.equal(createdFee.status, 201);
    createdFeeIds.push(createdFee.body.data.id);

    const payment = await apiRequest("/payments", studentToken, "POST", {
      feeId: createdFee.body.data.id,
      amount: 40,
      paymentMethod: "CARD",
      transactionId: `integration-${randomUUID()}`,
      status: "SUCCESS"
    });
    assert.equal(payment.status, 201);

    const fee = await apiRequest(`/fees/${createdFee.body.data.id}`, studentToken);
    assert.equal(fee.status, 200);
    assert.equal(Number(fee.body.data.paidAmount), 40);
    assert.equal(fee.body.data.status, "PARTIAL");

    const updatedPayment = await apiRequest(`/payments/${payment.body.data.id}`, adminToken, "PATCH", {
      amount: 50
    });
    assert.equal(updatedPayment.status, 200);

    const updatedFee = await apiRequest(`/fees/${createdFee.body.data.id}`, studentToken);
    assert.equal(Number(updatedFee.body.data.paidAmount), 50);

    const deletedPayment = await apiRequest(`/payments/${payment.body.data.id}`, adminToken, "DELETE");
    assert.equal(deletedPayment.status, 200);
    const resetFee = await apiRequest(`/fees/${createdFee.body.data.id}`, studentToken);
    assert.equal(Number(resetFee.body.data.paidAmount), 0);
    assert.equal(resetFee.body.data.status, "PENDING");

    const deletedFee = await apiRequest(`/fees/${createdFee.body.data.id}`, adminToken, "DELETE");
    assert.equal(deletedFee.status, 200);
  });

  await context.test("student progress upsert appears in the self summary", async () => {
    const updated = await apiRequest("/progress", studentToken, "POST", {
      studentId: studentProfileId,
      chapterId,
      progress: 65,
      completed: false,
      lastAccessedAt: new Date().toISOString()
    });
    assert.equal(updated.status, 201);
    assert.equal(updated.body.data.progress, 65);

    const progressId = updated.body.data.id;
    const patched = await apiRequest(`/progress/${progressId}`, studentToken, "PATCH", {
      progress: 75,
      completed: true
    });
    assert.equal(patched.status, 200);

    const summary = await apiRequest("/progress/summary", studentToken);
    assert.equal(summary.status, 200);
    assert.equal(summary.body.data.studentId, studentProfileId);
    assert.equal(summary.body.data.totalEntries, 1);
    assert.equal(summary.body.data.averageProgress, 75);

    const studentDelete = await apiRequest(`/progress/${progressId}`, studentToken, "DELETE");
    assert.equal(studentDelete.status, 403);
    const adminDelete = await apiRequest(`/progress/${progressId}`, adminToken, "DELETE");
    assert.equal(adminDelete.status, 200);
  });

  await context.test("user listing is restricted to administrators", async () => {
    const [adminUsers, studentUsers] = await Promise.all([
      apiRequest("/users?page=1&limit=5", adminToken),
      apiRequest("/users?page=1&limit=5", studentToken)
    ]);
    assert.equal(adminUsers.status, 200);
    assert.equal(studentUsers.status, 403);
  });

  await context.test("administrators can create, read, update, and delete users", async () => {
    const email = `integration-user-crud-${randomUUID()}@example.test`;
    const created = await apiRequest("/users", adminToken, "POST", {
      name: "User CRUD Fixture",
      email,
      password: "UserCrudPass123!",
      role: "STUDENT",
      phone: "5551234567"
    });
    assert.equal(created.status, 201);
    const userId = created.body.data.id;
    createdUserIds.push(userId);
    assert.equal(Object.hasOwn(created.body.data, "password"), false);

    const fetched = await apiRequest(`/users/${userId}`, adminToken);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.data.email, email);
    assert.equal(Object.hasOwn(fetched.body.data, "password"), false);

    const updated = await apiRequest(`/users/${userId}`, adminToken, "PATCH", {
      name: "Updated User CRUD Fixture",
      isActive: false
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.name, "Updated User CRUD Fixture");
    assert.equal(updated.body.data.isActive, false);

    const deleted = await apiRequest(`/users/${userId}`, adminToken, "DELETE");
    assert.equal(deleted.status, 200);
    assert.equal(await prisma.user.count({ where: { id: userId } }), 0);
  });

  await context.test("course and enrollment lists respect the signed-in student", async () => {
    const [courses, ownEnrollments, otherEnrollments] = await Promise.all([
      apiRequest("/courses?page=1&limit=20", studentToken),
      apiRequest("/enrollments?page=1&limit=20", studentToken),
      apiRequest("/enrollments?page=1&limit=20", otherStudentToken)
    ]);
    assert.equal(courses.status, 200);
    assert.ok(courses.body.data.some((course: { id: number }) => course.id === createdCourseId));
    assert.equal(ownEnrollments.status, 200);
    assert.ok(ownEnrollments.body.data.some(
      (enrollment: { courseId: number; studentId: number }) =>
        enrollment.courseId === createdCourseId && enrollment.studentId === studentProfileId
    ));
    assert.equal(otherEnrollments.status, 200);
    assert.equal(otherEnrollments.body.data.length, 0);
  });

  await context.test("students can enroll and remove only their own enrollment", async () => {
    const created = await apiRequest("/enrollments", otherStudentToken, "POST", {
      courseId: createdCourseId
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.studentId, otherStudentProfileId);

    const removed = await apiRequest(`/enrollments/${created.body.data.id}`, otherStudentToken, "DELETE");
    assert.equal(removed.status, 200);

    const remaining = await apiRequest("/enrollments", otherStudentToken);
    assert.equal(remaining.body.data.length, 0);
  });

  await context.test("admin can create, update, and delete a course", async () => {
    const created = await apiRequest("/courses", adminToken, "POST", {
      name: `Course CRUD ${randomUUID().slice(0, 8)}`,
      description: "Course CRUD integration fixture"
    });
    assert.equal(created.status, 201);

    const updated = await apiRequest(`/courses/${created.body.data.id}`, adminToken, "PATCH", {
      name: "Updated Course CRUD",
      status: "INACTIVE"
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.status, "INACTIVE");

    const deleted = await apiRequest(`/courses/${created.body.data.id}`, adminToken, "DELETE");
    assert.equal(deleted.status, 200);
  });

  await context.test("tests and questions support authorized create, update, and delete", async () => {
    const createdTest = await apiRequest("/tests", adminToken, "POST", {
      subjectId,
      title: `Test CRUD ${randomUUID().slice(0, 8)}`,
      totalMarks: 3,
      status: "DRAFT"
    });
    assert.equal(createdTest.status, 201);

    const studentStart = await apiRequest(`/tests/${createdTest.body.data.id}/attempts`, studentToken, "POST", {});
    assert.equal(studentStart.status, 403);

    const updatedTest = await apiRequest(`/tests/${createdTest.body.data.id}`, adminToken, "PATCH", {
      title: "Updated Test CRUD",
      status: "PUBLISHED"
    });
    assert.equal(updatedTest.status, 200);

    const createdQuestion = await apiRequest(`/tests/${createdTest.body.data.id}/questions`, adminToken, "POST", {
      question: "Test CRUD question?",
      type: "MCQ",
      marks: 3,
      options: [
        { optionText: "Correct", isCorrect: true },
        { optionText: "Incorrect", isCorrect: false }
      ]
    });
    assert.equal(createdQuestion.status, 201);

    const updatedQuestion = await apiRequest(`/questions/${createdQuestion.body.data.id}`, adminToken, "PATCH", {
      question: "Updated test CRUD question?",
      marks: 2
    });
    assert.equal(updatedQuestion.status, 200);
    assert.equal(updatedQuestion.body.data.marks, 2);

    const deletedQuestion = await apiRequest(`/questions/${createdQuestion.body.data.id}`, adminToken, "DELETE");
    assert.equal(deletedQuestion.status, 200);
    const deletedTest = await apiRequest(`/tests/${createdTest.body.data.id}`, adminToken, "DELETE");
    assert.equal(deletedTest.status, 200);
  });

  await context.test("admin can create chapter, video, and note over HTTP", async () => {
    const createdChapter = await apiRequest("/chapters", adminToken, "POST", {
      subjectId,
      title: "API-created chapter",
      order: 2
    });
    assert.equal(createdChapter.status, 201);
    assert.ok(createdChapter.body.data.id);

    const video = await apiRequest("/videos", adminToken, "POST", {
      chapterId: createdChapter.body.data.id,
      title: "Integration lesson video",
      videoUrl: "https://example.test/integration-video",
      duration: 120
    });
    assert.equal(video.status, 201);

    const updatedChapter = await apiRequest(`/chapters/${createdChapter.body.data.id}`, adminToken, "PATCH", {
      title: "Updated API-created chapter",
      order: 3
    });
    assert.equal(updatedChapter.status, 200);

    const updatedVideo = await apiRequest(`/videos/${video.body.data.id}`, adminToken, "PATCH", {
      title: "Updated integration lesson video",
      duration: 180
    });
    assert.equal(updatedVideo.status, 200);

    const note = await apiRequest("/notes", adminToken, "POST", {
      chapterId: createdChapter.body.data.id,
      title: "Integration lesson notes",
      content: "Content created via HTTP integration test"
    });
    assert.equal(note.status, 201);

    const updatedNote = await apiRequest(`/notes/${note.body.data.id}`, adminToken, "PATCH", {
      title: "Updated integration lesson notes",
      content: "Updated test content"
    });
    assert.equal(updatedNote.status, 200);

    const listedNotes = await apiRequest(`/notes?chapterId=${createdChapter.body.data.id}`, studentToken);
    assert.equal(listedNotes.status, 200);
    assert.ok(listedNotes.body.data.some((item: { id: number }) => item.id === note.body.data.id));

    const deletedNote = await apiRequest(`/notes/${note.body.data.id}`, adminToken, "DELETE");
    const deletedVideo = await apiRequest(`/videos/${video.body.data.id}`, adminToken, "DELETE");
    const deletedChapter = await apiRequest(`/chapters/${createdChapter.body.data.id}`, adminToken, "DELETE");
    assert.equal(deletedNote.status, 200);
    assert.equal(deletedVideo.status, 200);
    assert.equal(deletedChapter.status, 200);
  });

  await context.test("subjects support create, list, update, and delete through the API", async () => {
    const created = await apiRequest("/subjects", adminToken, "POST", {
      courseId: createdCourseId,
      name: `CRUD Subject ${randomUUID().slice(0, 8)}`,
      description: "Subject CRUD integration fixture"
    });
    assert.equal(created.status, 201);
    const createdSubjectId = created.body.data.id;

    const listed = await apiRequest(`/subjects?courseId=${createdCourseId}`, adminToken);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.data.some((subject: { id: number }) => subject.id === createdSubjectId));

    const updated = await apiRequest(`/subjects/${createdSubjectId}`, adminToken, "PATCH", {
      name: "Updated CRUD Subject",
      status: "DRAFT"
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.status, "DRAFT");

    const assignment = await apiRequest("/teacher-subjects", adminToken, "POST", {
      teacherId: teacherProfileId,
      subjectId: createdSubjectId
    });
    assert.equal(assignment.status, 201);

    const teacherAssignments = await apiRequest(`/teacher-subjects?subjectId=${createdSubjectId}`, teacherToken);
    assert.equal(teacherAssignments.status, 200);
    assert.equal(teacherAssignments.body.data[0].teacherId, teacherProfileId);

    const removedAssignment = await apiRequest(
      `/teacher-subjects/${createdSubjectId}/${teacherProfileId}`,
      adminToken,
      "DELETE"
    );
    assert.equal(removedAssignment.status, 200);

    const deleted = await apiRequest(`/subjects/${createdSubjectId}`, adminToken, "DELETE");
    assert.equal(deleted.status, 200);
  });

  await context.test("assessment CSV export includes metrics and respects role access", async () => {
    const exported = await textApiRequest(`/reports/assessments/export.csv?subjectId=${subjectId}`, adminToken);
    assert.equal(exported.status, 200);
    assert.match(exported.contentType ?? "", /text\/csv/);
    assert.match(exported.contentDisposition ?? "", /attachment; filename=assessment-report\.csv/);
    assert.match(exported.body, /"test_id","test_title"/);
    assert.match(exported.body, /Attempt API integration test/);
    assert.match(exported.body, /88\.89/);

    const studentExport = await textApiRequest("/reports/assessments/export.csv", studentToken);
    assert.equal(studentExport.status, 403);
  });
});