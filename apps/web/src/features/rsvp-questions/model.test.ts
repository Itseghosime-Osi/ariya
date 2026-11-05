import { describe, expect, it } from "vitest";
import {
  answersFromForm,
  answersProblem,
  newQuestionId,
  questionsSchema,
  readAnswers,
  readQuestions,
  type RsvpQuestion,
} from "./model";

const meal: RsvpQuestion = {
  id: "q1",
  label: "Meal?",
  type: "choice",
  options: ["Jollof", "Fried"],
  required: true,
};
const song: RsvpQuestion = {
  id: "q2",
  label: "Song?",
  type: "text",
  required: false,
};

describe("questionsSchema", () => {
  it("accepts a valid set", () => {
    expect(questionsSchema.safeParse([meal, song]).success).toBe(true);
  });
  it("needs two choices on a choice question", () => {
    expect(
      questionsSchema.safeParse([{ ...meal, options: ["Only one"] }]).success
    ).toBe(false);
  });
  it("caps the count at eight and refuses duplicates", () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({
      ...song,
      id: `q${i}`,
    }));
    expect(questionsSchema.safeParse(nine).success).toBe(false);
    expect(questionsSchema.safeParse([song, song]).success).toBe(false);
  });
});

describe("readQuestions / readAnswers", () => {
  it("drops malformed entries", () => {
    expect(readQuestions([meal, { id: "x" }, "no"])).toEqual([meal]);
    expect(readQuestions(null)).toEqual([]);
  });
  it("keeps only string answers", () => {
    expect(readAnswers({ q1: "Jollof", q2: 3 })).toEqual({ q1: "Jollof" });
    expect(readAnswers([])).toEqual({});
  });
});

describe("answersFromForm", () => {
  it("reads trimmed ans_ fields and skips blanks", () => {
    const form = new Map<string, string>([
      ["ans_q1", " Jollof "],
      ["ans_q2", "  "],
    ]);
    expect(answersFromForm([meal, song], (n) => form.get(n) ?? null)).toEqual({
      q1: "Jollof",
    });
  });
});

describe("answersProblem", () => {
  it("requires required answers only when accepting", () => {
    expect(answersProblem([meal], {}, true)).toMatch(/Meal/);
    expect(answersProblem([meal], {}, false)).toBeNull();
  });
  it("rejects a choice outside the options", () => {
    expect(answersProblem([meal], { q1: "Pizza" }, true)).toMatch(/choices/);
    expect(answersProblem([meal], { q1: "Fried" }, true)).toBeNull();
  });
  it("accepts only Yes or No on a yes/no question", () => {
    const yn: RsvpQuestion = { ...song, id: "q3", type: "yesno" };
    expect(answersProblem([yn], { q3: "Maybe" }, true)).toMatch(/Yes or No/);
    expect(answersProblem([yn], { q3: "Yes" }, true)).toBeNull();
  });
});

describe("newQuestionId", () => {
  it("picks the first free id", () => {
    expect(newQuestionId([])).toBe("q1");
    expect(newQuestionId([meal, song])).toBe("q3");
  });
});
