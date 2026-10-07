import prisma from "../config/database.js";
import { gradeObjectiveAnswers } from "../utils/attempt-scoring.js";
import { HttpError } from "../utils/http-error.js";
import type {
  AttemptListQueryInput,
  GradeAttemptAnswersInput,
  SaveAttemptAnswersInput
} from "../validations/attempt.validation.js";

const attemptSelect = {
  id: true,
  testId: true,
  studentId: true,
  startedAt: true,
  submittedAt: true,
  status: true,
  score: true,
  totalMarks: true,
  test: {
    select: {
      id: true,
      title: true,
      duration: true,
      totalMarks: true,
      status: true
    }
  },
  answers: {
    orderBy: { questionId: "asc" },
    select: {
      id: true,
      questionId: true,
      selectedOptionId: true,
      answerText: true,
      isCorrect: true,
      marks: true,
      answeredAt: true
    }
  }
} as const;

const getStudentProfileId = async (userId: number) => {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  return profile?.id ?? null;
};

const getAvailableTest = async (studentId: number, testId: number) => {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      duration: true,
      subject: {
        select: {
          course: {
            select: {
              enrollments: {
                where: { studentId },
                select: { id: true }
              }
            }
          }
        }
      }
    }
  });

  if (!test || test.subject.course.enrollments.length === 0) {
    throw new HttpError("Test not found or access denied", 404);
  }

  const now = new Date();
  if (
    test.status !== "PUBLISHED" ||
    (test.startAt && test.startAt > now) ||
    (test.endAt && test.endAt < now)
  ) {
    throw new HttpError("This test is not currently available", 403);
  }

  return test;
};

const getOwnedAttempt = async (userId: number, attemptId: number) => {
  const studentId = await getStudentProfileId(userId);
  if (!studentId) {
    throw new HttpError("Student profile not found", 403);
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      studentId: true,
      testId: true,
      status: true,
      startedAt: true,
      test: { select: { duration: true } }
    }
  });

  if (!attempt || attempt.studentId !== studentId) {
    throw new HttpError("Attempt not found", 404);
  }

  return attempt;
};

const finalizeAttempt = async (attemptId: number, timedOut = false) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      test: {
        select: {
          totalMarks: true,
          questions: {
            select: {
              id: true,
              type: true,
              marks: true,
              negativeMarks: true,
              options: { select: { id: true, isCorrect: true } }
            }
          }
        }
      },
      answers: {
        select: { id: true, questionId: true, selectedOptionId: true }
      }
    }
  });

  if (!attempt) {
    throw new HttpError("Attempt not found", 404);
  }

  const grading = gradeObjectiveAnswers(attempt.test.questions, attempt.answers);

  await prisma.$transaction(async (transaction) => {
    for (const grade of grading.grades) {
      await transaction.studentAnswer.update({
        where: { id: grade.answerId },
        data: { isCorrect: grade.isCorrect, marks: grade.marks }
      });
    }

    await transaction.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: timedOut ? "AUTO_SUBMITTED" : "SUBMITTED",
        submittedAt: new Date(),
        score: grading.score,
        totalMarks: attempt.test.totalMarks
      }
    });
  });

  return prisma.examAttempt.findUniqueOrThrow({ where: { id: attemptId }, select: attemptSelect });
};

const expireIfNeeded = async (attempt: Awaited<ReturnType<typeof getOwnedAttempt>>) => {
  if (
    attempt.status === "IN_PROGRESS" &&
    attempt.test.duration &&
    Date.now() >= attempt.startedAt.getTime() + attempt.test.duration * 60_000
  ) {
    return finalizeAttempt(attempt.id, true);
  }

  return null;
};

export const startAttempt = async (actor: { userId: number; role: string }, testId: number) => {
  if (actor.role !== "STUDENT") {
    throw new HttpError("Only students can start an attempt", 403);
  }

  const studentId = await getStudentProfileId(actor.userId);
  if (!studentId) {
    throw new HttpError("Student profile not found", 403);
  }

  await getAvailableTest(studentId, testId);

  const existing = await prisma.examAttempt.findUnique({
    where: { testId_studentId: { testId, studentId } },
    select: { id: true, status: true }
  });

  if (existing) {
    if (existing.status !== "IN_PROGRESS") {
      throw new HttpError("This test attempt has already been submitted", 409);
    }

    const expired = await expireIfNeeded(await getOwnedAttempt(actor.userId, existing.id));
    if (expired) {
      throw new HttpError("The time limit for this attempt has expired", 409);
    }

    return prisma.examAttempt.findUniqueOrThrow({ where: { id: existing.id }, select: attemptSelect });
  }

  return prisma.examAttempt.create({
    data: { testId, studentId },
    select: attemptSelect
  });
};

export const getAttempt = async (actor: { userId: number; role: string }, attemptId: number) => {
  if (actor.role !== "STUDENT") {
    throw new HttpError("Attempt not found", 404);
  }

  const attempt = await getOwnedAttempt(actor.userId, attemptId);
  const expired = await expireIfNeeded(attempt);
  if (expired) {
    return expired;
  }

  return prisma.examAttempt.findUniqueOrThrow({ where: { id: attemptId }, select: attemptSelect });
};

export const saveAttemptAnswers = async (
  actor: { userId: number; role: string },
  attemptId: number,
  input: SaveAttemptAnswersInput
) => {
  if (actor.role !== "STUDENT") {
    throw new HttpError("Only the student who started the attempt can answer it", 403);
  }

  const attempt = await getOwnedAttempt(actor.userId, attemptId);
  const expired = await expireIfNeeded(attempt);
  if (expired) {
    throw new HttpError("The time limit for this attempt has expired", 409);
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new HttpError("Submitted attempts cannot be changed", 409);
  }

  await getAvailableTest(attempt.studentId, attempt.testId);

  const questionIds = input.answers.map((answer) => answer.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds }, testId: attempt.testId },
    select: { id: true, type: true, options: { select: { id: true } } }
  });
  const questionsById = new Map(questions.map((question) => [question.id, question]));

  if (questions.length !== questionIds.length) {
    throw new HttpError("One or more questions do not belong to this test", 400);
  }

  for (const answer of input.answers) {
    const question = questionsById.get(answer.questionId)!;
    if (answer.selectedOptionId != null && !question.options.some((option) => option.id === answer.selectedOptionId)) {
      throw new HttpError("Selected option does not belong to its question", 400);
    }
    if (answer.selectedOptionId != null && !["MCQ", "TRUE_FALSE"].includes(question.type)) {
      throw new HttpError("Text questions cannot use a selected option", 400);
    }
  }

  await prisma.$transaction(input.answers.map((answer) => prisma.studentAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId: answer.questionId } },
    update: {
      selectedOptionId: answer.selectedOptionId ?? null,
      answerText: answer.answerText ?? null,
      answeredAt: new Date()
    },
    create: {
      attemptId,
      questionId: answer.questionId,
      studentId: attempt.studentId,
      selectedOptionId: answer.selectedOptionId ?? null,
      answerText: answer.answerText ?? null
    }
  })));

  return prisma.examAttempt.findUniqueOrThrow({ where: { id: attemptId }, select: attemptSelect });
};

export const submitAttempt = async (actor: { userId: number; role: string }, attemptId: number) => {
  if (actor.role !== "STUDENT") {
    throw new HttpError("Only the student who started the attempt can submit it", 403);
  }

  const attempt = await getOwnedAttempt(actor.userId, attemptId);
  const expired = await expireIfNeeded(attempt);
  if (expired) {
    return expired;
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new HttpError("Attempt has already been submitted", 409);
  }

  return finalizeAttempt(attemptId);
};

export const gradeAttemptAnswers = async (
  actor: { userId: number; role: string },
  attemptId: number,
  input: GradeAttemptAnswersInput
) => {
  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(actor.role)) {
    throw new HttpError("You do not have permission to grade attempts", 403);
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      test: {
        select: {
          totalMarks: true,
          createdById: true,
          subjectId: true
        }
      },
      answers: {
        select: {
          id: true,
          marks: true,
          question: { select: { type: true, marks: true } }
        }
      }
    }
  });

  if (!attempt) {
    throw new HttpError("Attempt not found", 404);
  }
  if (!["SUBMITTED", "AUTO_SUBMITTED"].includes(attempt.status)) {
    throw new HttpError("Only submitted attempts can be graded", 409);
  }

  if (actor.role === "TEACHER") {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    const assigned = teacher
      ? await prisma.teacherSubject.findUnique({
          where: {
            teacherId_subjectId: {
              teacherId: teacher.id,
              subjectId: attempt.test.subjectId
            }
          },
          select: { id: true }
        })
      : null;

    if (!assigned && attempt.test.createdById !== actor.userId) {
      throw new HttpError("You do not have permission to grade this test", 403);
    }
  }

  const answersById = new Map(attempt.answers.map((answer) => [answer.id, answer]));
  for (const grade of input.grades) {
    const answer = answersById.get(grade.answerId);
    if (!answer) {
      throw new HttpError("One or more answers do not belong to this attempt", 400);
    }
    if (!["SHORT_ANSWER", "LONG_ANSWER"].includes(answer.question.type)) {
      throw new HttpError("Only subjective answers can be manually graded", 400);
    }
    if (grade.marks > answer.question.marks) {
      throw new HttpError("Awarded marks cannot exceed the question maximum", 400);
    }
  }

  await prisma.$transaction(async (transaction) => {
    for (const grade of input.grades) {
      await transaction.studentAnswer.update({
        where: { id: grade.answerId },
        data: { marks: grade.marks, isCorrect: null }
      });
    }

    const answersWithMarks = await transaction.studentAnswer.findMany({
      where: { attemptId, marks: { not: null } },
      select: { marks: true }
    });
    const score = Math.max(0, answersWithMarks.reduce((total, answer) => total + Number(answer.marks), 0));

    await transaction.examAttempt.update({
      where: { id: attemptId },
      data: { score, totalMarks: attempt.test.totalMarks }
    });
  });

  return prisma.examAttempt.findUniqueOrThrow({ where: { id: attemptId }, select: attemptSelect });
};

export const listAttempts = async (
  actor: { userId: number; role: string },
  query: AttemptListQueryInput
) => {
  const where: Record<string, unknown> = {};

  if (query.testId) {
    where.testId = query.testId;
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);
    if (!studentId) {
      return { data: [], pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 1 } };
    }
    where.studentId = studentId;
  } else if (["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
    if (query.studentId) {
      where.studentId = query.studentId;
    }
  } else if (actor.role === "TEACHER") {
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!teacher) {
      return { data: [], pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 1 } };
    }
    where.test = { subject: { teachers: { some: { teacherId: teacher.id } } } };
  } else {
    throw new HttpError("You do not have permission to view attempts", 403);
  }

  const [data, total] = await Promise.all([
    prisma.examAttempt.findMany({
      where,
      select: attemptSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ startedAt: "desc" }, { id: "desc" }]
    }),
    prisma.examAttempt.count({ where })
  ]);

  return {
    data,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) || 1 }
  };
};