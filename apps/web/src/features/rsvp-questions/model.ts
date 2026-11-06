import { z } from "zod";

/** The most questions a host may ask; the database enforces the same cap. */
export const MAX_QUESTIONS = 8;
export const MAX_OPTIONS = 8;
export const MAX_ANSWER_LENGTH = 300;

export const QUESTION_TYPES = ["text", "choice", "yesno"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const questionSchema = z
  .object({
    id: z.string().regex(/^q[a-z0-9]{1,12}$/, "Bad question id"),
    label: z
      .string()
      .trim()
      .min(1, "Write the question")
      .max(120, "Keep each question under 120 characters"),
    type: z.enum(QUESTION_TYPES),
    options: z
      .array(z.string().trim().min(1).max(40))
      .max(MAX_OPTIONS)
      .optional(),
    required: z.boolean(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "choice" && (q.options?.length ?? 0) < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `Give "${q.label}" at least two choices`,
      });
    }
  });

export const questionsSchema = z
  .array(questionSchema)
  .max(MAX_QUESTIONS, `Ask at most ${MAX_QUESTIONS} questions`)
  .refine((qs) => new Set(qs.map((q) => q.id)).size === qs.length, {
    message: "Duplicate question",
  });

export type RsvpQuestion = z.infer<typeof questionSchema>;
export type RsvpAnswers = Record<string, string>;

/** Starter questions a host can add with one tap. */
export const QUESTION_SUGGESTIONS: ReadonlyArray<Omit<RsvpQuestion, "id">> = [
  {
    label: "Which meal would you like?",
    type: "choice",
    options: ["Jollof rice", "Fried rice", "Vegetarian"],
    required: true,
  },
  {
    label: "Are you coming with a driver or by car?",
    type: "yesno",
    required: false,
  },
  {
    label: "Any allergies we should know about?",
    type: "text",
    required: false,
  },
  { label: "A song that gets you dancing?", type: "text", required: false },
];

export function newQuestionId(existing: readonly RsvpQuestion[]): string {
  const taken = new Set(existing.map((q) => q.id));
  for (let n = 1; n < 100; n += 1) {
    const id = `q${n}`;
    if (!taken.has(id)) return id;
  }
  return `q${Date.now().toString(36).slice(-8)}`;
}

/** Reads what the database stored; anything malformed is dropped rather than shown. */
export function readQuestions(raw: unknown): RsvpQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: RsvpQuestion[] = [];
  for (const item of raw) {
    const parsed = questionSchema.safeParse(item);
    if (parsed.success && !out.some((q) => q.id === parsed.data.id)) {
      out.push(parsed.data);
    }
  }
  return out.slice(0, MAX_QUESTIONS);
}

export function readAnswers(raw: unknown): RsvpAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: RsvpAnswers = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Answers keyed by question id, from a submitted form's `ans_<id>` fields. */
export function answersFromForm(
  questions: readonly RsvpQuestion[],
  get: (name: string) => FormDataEntryValue | null
): RsvpAnswers {
  const out: RsvpAnswers = {};
  for (const q of questions) {
    const value = String(get(`ans_${q.id}`) ?? "")
      .trim()
      .slice(0, MAX_ANSWER_LENGTH);
    if (value) out[q.id] = value;
  }
  return out;
}

/**
 * The first problem with a guest's answers, or null. Declining guests are never made to answer, so
 * `required` only applies when they are coming.
 */
export function answersProblem(
  questions: readonly RsvpQuestion[],
  answers: RsvpAnswers,
  accepting: boolean
): string | null {
  for (const q of questions) {
    const value = answers[q.id];
    if (!value) {
      if (accepting && q.required) return `Please answer: ${q.label}`;
      continue;
    }
    if (q.type === "choice" && !q.options?.includes(value)) {
      return `Please pick one of the choices for: ${q.label}`;
    }
    if (q.type === "yesno" && value !== "Yes" && value !== "No") {
      return `Please answer Yes or No: ${q.label}`;
    }
  }
  return null;
}
