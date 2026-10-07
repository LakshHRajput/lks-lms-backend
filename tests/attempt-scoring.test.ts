import assert from "node:assert/strict";
import test from "node:test";

import { gradeObjectiveAnswers } from "../src/utils/attempt-scoring.js";

const questions = [
  {
    id: 10,
    type: "MCQ",
    marks: 5,
    negativeMarks: 2,
    options: [
      { id: 101, isCorrect: true },
      { id: 102, isCorrect: false }
    ]
  },
  {
    id: 11,
    type: "SHORT_ANSWER",
    marks: 4,
    negativeMarks: 0,
    options: []
  }
];

test("awards positive marks for a correct objective answer", () => {
  const result = gradeObjectiveAnswers(questions, [
    { id: 1, questionId: 10, selectedOptionId: 101 }
  ]);

  assert.deepEqual(result.grades, [{ answerId: 1, isCorrect: true, marks: 5 }]);
  assert.equal(result.score, 5);
});

test("applies negative marks for an incorrect selected option", () => {
  const result = gradeObjectiveAnswers(questions, [
    { id: 2, questionId: 10, selectedOptionId: 102 }
  ]);

  assert.deepEqual(result.grades, [{ answerId: 2, isCorrect: false, marks: -2 }]);
  assert.equal(result.score, 0);
});

test("does not penalize an unanswered objective question", () => {
  const result = gradeObjectiveAnswers(questions, [
    { id: 3, questionId: 10, selectedOptionId: null }
  ]);

  assert.deepEqual(result.grades, [{ answerId: 3, isCorrect: false, marks: 0 }]);
  assert.equal(result.score, 0);
});

test("excludes subjective questions from automatic grading", () => {
  const result = gradeObjectiveAnswers(questions, [
    { id: 4, questionId: 11, selectedOptionId: null }
  ]);

  assert.deepEqual(result.grades, []);
  assert.equal(result.score, 0);
});

test("floors combined objective score at zero", () => {
  const result = gradeObjectiveAnswers(questions, [
    { id: 5, questionId: 10, selectedOptionId: 102 },
    { id: 6, questionId: 10, selectedOptionId: 102 }
  ]);

  assert.equal(result.score, 0);
});