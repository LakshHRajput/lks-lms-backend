import prisma from "../config/database.js";
import { HttpError } from "../utils/http-error.js";
import type {
  CreateQuestionInput,
  QuestionListQueryInput,
  UpdateQuestionInput
} from "../validations/question.validation.js";

const questionOptionOrderBy = [{ order: "asc" as const }, { id: "asc" as const }];

const questionSelect = {
  id: true,
  testId: true,
  question: true,
  type: true,
  marks: true,
  negativeMarks: true,
  order: true,
  options: {
    orderBy: questionOptionOrderBy,
    select: {
      id: true,
      questionId: true,
      optionText: true,
      isCorrect: true,
      order: true
    }
  },
  test: {
    select: {
      id: true,
      title: true,
      status: true,
      subject: {
        select: {
          id: true,
          name: true,
          course: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  }
};

const getTeacherProfileId = async (userId: number) => {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  return teacherProfile?.id ?? null;
};

const getStudentProfileId = async (userId: number) => {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  return studentProfile?.id ?? null;
};

const verifyTeacherAssignment = async (userId: number, subjectId: number) => {
  const teacherId = await getTeacherProfileId(userId);

  if (!teacherId) {
    return false;
  }

  const link = await prisma.teacherSubject.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId,
        subjectId
      }
    },
    select: { id: true }
  });

  return Boolean(link);
};

const validateQuestionAccess = async (
  actor: { userId: number; role: string },
  testId: number
) => {
  const studentId = actor.role === "STUDENT" ? await getStudentProfileId(actor.userId) : null;
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      subjectId: true,
      createdById: true,
      status: true,
      startAt: true,
      endAt: true,
      attempts: {
        where: { studentId: studentId ?? -1, status: "IN_PROGRESS" },
        select: { id: true }
      },
      subject: {
        select: {
          course: {
            select: {
              enrollments: {
                select: {
                  studentId: true
                }
              }
            }
          },
          teachers: {
            select: {
              teacherId: true
            }
          }
        }
      }
    }
  });

  if (!test) {
    throw new HttpError("Test not found", 404);
  }

  if (actor.role === "SUPER_ADMIN" || actor.role === "ADMIN") {
    return test;
  }

  if (actor.role === "TEACHER") {
    const hasAccess =
      test.createdById === actor.userId ||
      (await verifyTeacherAssignment(actor.userId, test.subjectId));

    if (!hasAccess) {
      throw new HttpError("You do not have access to this test", 403);
    }

    return test;
  }

  if (actor.role === "STUDENT") {
    const now = new Date();
    if (
      !studentId ||
      test.status !== "PUBLISHED" ||
      (test.startAt && test.startAt > now) ||
      (test.endAt && test.endAt < now) ||
      test.attempts.length === 0
    ) {
      throw new HttpError("You do not have access to this test", 403);
    }

    const enrollmentExists = test.subject.course.enrollments.some(
      (item) => item.studentId === studentId
    );

    if (!enrollmentExists) {
      throw new Error("You do not have access to this test");
    }

    return test;
  }

  throw new HttpError("You do not have access to this test", 403);
};

const hideAnswerKey = <T extends {
  options: readonly { id: number; questionId: number; optionText: string; order: number; isCorrect: boolean }[];
}>(question: T) => ({
  ...question,
  options: question.options.map(({ id, questionId, optionText, order }) => ({
    id,
    questionId,
    optionText,
    order
  }))
});

export const listQuestions = async (
  actor: { userId: number; role: string },
  testId: number,
  query: QuestionListQueryInput
) => {
  await validateQuestionAccess(actor, testId);

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where: { testId },
      select: questionSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ order: "asc" }, { id: "asc" }]
    }),
    prisma.question.count({ where: { testId } })
  ]);

  return {
    data: actor.role === "STUDENT" ? questions.map(hideAnswerKey) : questions,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getQuestionById = async (
  actor: { userId: number; role: string },
  questionId: number
) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: questionSelect
  });

  if (!question) {
    throw new Error("Question not found");
  }

  await validateQuestionAccess(actor, question.testId);

  return actor.role === "STUDENT" ? hideAnswerKey(question) : question;
};

export const createQuestion = async (
  actor: { userId: number; role: string },
  testId: number,
  input: CreateQuestionInput
) => {
  await validateQuestionAccess(actor, testId);

  if (["MCQ", "TRUE_FALSE"].includes(input.type) && input.options.length < 2) {
    throw new Error("Multiple choice questions must include at least two options");
  }

  if (input.options.length > 0) {
    const correctCount = input.options.filter((option) => option.isCorrect).length;
    if (correctCount === 0 && ["MCQ", "TRUE_FALSE"].includes(input.type)) {
      throw new Error("Multiple choice questions must include at least one correct answer");
    }
  }

  return prisma.question.create({
    data: {
      testId,
      question: input.question,
      type: input.type,
      marks: input.marks,
      negativeMarks: input.negativeMarks,
      order: input.order,
      options: {
        create: input.options.map((option, index) => ({
          optionText: option.optionText,
          isCorrect: option.isCorrect,
          order: option.order ?? index
        }))
      }
    },
    select: questionSelect
  });
};

export const updateQuestion = async (
  actor: { userId: number; role: string },
  questionId: number,
  input: UpdateQuestionInput
) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      testId: true,
      type: true,
      options: {
        select: {
          id: true,
          optionText: true,
          isCorrect: true,
          order: true
        }
      }
    }
  });

  if (!question) {
    throw new Error("Question not found");
  }

  await validateQuestionAccess(actor, question.testId);

  if (input.options && input.options.length > 0) {
    const correctCount = input.options.filter((option) => option.isCorrect).length;
    if (["MCQ", "TRUE_FALSE"].includes(input.type ?? question.type) && correctCount === 0) {
      throw new Error("Multiple choice questions must include at least one correct answer");
    }
  }

  const updatedQuestion = await prisma.question.update({
    where: { id: questionId },
    data: {
      ...(input.question ? { question: input.question } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.marks ? { marks: input.marks } : {}),
      ...(input.negativeMarks !== undefined ? { negativeMarks: input.negativeMarks } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(input.options
        ? {
            options: {
              deleteMany: {},
              create: input.options.map((option, index) => ({
                optionText: option.optionText,
                isCorrect: option.isCorrect,
                order: option.order ?? index
              }))
            }
          }
        : {})
    },
    select: questionSelect
  });

  return updatedQuestion;
};

export const deleteQuestion = async (
  actor: { userId: number; role: string },
  questionId: number
) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      testId: true
    }
  });

  if (!question) {
    throw new Error("Question not found");
  }

  await validateQuestionAccess(actor, question.testId);

  await prisma.question.delete({ where: { id: questionId } });

  return { message: "Question deleted successfully" };
};
