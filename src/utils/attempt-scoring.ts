export interface ObjectiveQuestionForScoring {
  id: number;
  type: string;
  marks: number;
  negativeMarks: number;
  options: Array<{ id: number; isCorrect: boolean }>;
}

export interface AttemptAnswerForScoring {
  id: number;
  questionId: number;
  selectedOptionId: number | null;
}

export interface ObjectiveAnswerGrade {
  answerId: number;
  isCorrect: boolean;
  marks: number;
}

export const gradeObjectiveAnswers = (
  questions: ObjectiveQuestionForScoring[],
  answers: AttemptAnswerForScoring[]
) => {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const grades: ObjectiveAnswerGrade[] = [];

  for (const answer of answers) {
    const question = questionsById.get(answer.questionId);
    if (!question || !["MCQ", "TRUE_FALSE"].includes(question.type)) {
      continue;
    }

    const isCorrect = question.options.some(
      (option) => option.isCorrect && option.id === answer.selectedOptionId
    );
    const marks = isCorrect
      ? question.marks
      : answer.selectedOptionId !== null
        ? -question.negativeMarks
        : 0;

    grades.push({ answerId: answer.id, isCorrect, marks });
  }

  const score = Math.max(0, grades.reduce((total, grade) => total + grade.marks, 0));
  return { grades, score };
};