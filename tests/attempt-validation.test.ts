import assert from "node:assert/strict";
import test from "node:test";

import {
  attemptListQuerySchema,
  saveAttemptAnswersSchema
} from "../src/validations/attempt.validation.js";

test("coerces and defaults attempt list pagination", () => {
  assert.deepEqual(attemptListQuerySchema.parse({ page: "2", limit: "10" }), {
    page: 2,
    limit: 10
  });
  assert.deepEqual(attemptListQuerySchema.parse({}), { page: 1, limit: 20 });
});

test("accepts selected-option and text answers", () => {
  const result = saveAttemptAnswersSchema.safeParse({
    answers: [
      { questionId: 1, selectedOptionId: 10 },
      { questionId: 2, answerText: "Written response" }
    ]
  });

  assert.equal(result.success, true);
});

test("rejects answers without a response", () => {
  const result = saveAttemptAnswersSchema.safeParse({
    answers: [{ questionId: 1 }]
  });

  assert.equal(result.success, false);
});

test("rejects duplicate questions in one answer batch", () => {
  const result = saveAttemptAnswersSchema.safeParse({
    answers: [
      { questionId: 1, selectedOptionId: 10 },
      { questionId: 1, answerText: "Second response" }
    ]
  });

  assert.equal(result.success, false);
});