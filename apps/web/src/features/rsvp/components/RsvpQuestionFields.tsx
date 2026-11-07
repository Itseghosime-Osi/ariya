import React from "react";
import type {
  RsvpAnswers,
  RsvpQuestion,
} from "@/features/rsvp-questions/model";

interface RsvpQuestionFieldsProps {
  questions: RsvpQuestion[];
  answers: RsvpAnswers;
  labelClass: string;
  focusRing: string;
}

/** The host's own questions, shown to a guest who is coming. Fields post as ans_<id>. */
export function RsvpQuestionFields({
  questions,
  answers,
  labelClass,
  focusRing,
}: RsvpQuestionFieldsProps) {
  if (questions.length === 0) return null;
  const field = `min-h-12 w-full rounded-2xl border border-outline-variant/60 bg-white px-4 text-base text-night focus:outline-none focus:ring-2 ${focusRing}`;

  return (
    <div className="space-y-4 pt-2 border-t border-outline-variant/30">
      {questions.map((q) => {
        const name = `ans_${q.id}`;
        const id = `rsvp-${q.id}`;
        return (
          <div key={q.id} className="space-y-1.5">
            <label
              htmlFor={id}
              className={`text-[13px] font-semibold uppercase tracking-wider block ${labelClass}`}
            >
              {q.label}
              {!q.required && (
                <span className="ml-1 normal-case tracking-normal font-normal opacity-70">
                  (optional)
                </span>
              )}
            </label>
            {q.type === "text" && (
              <input
                id={id}
                name={name}
                type="text"
                required={q.required}
                maxLength={300}
                defaultValue={answers[q.id] ?? ""}
                className={field}
              />
            )}
            {q.type === "choice" && (
              <select
                id={id}
                name={name}
                required={q.required}
                defaultValue={answers[q.id] ?? ""}
                className={field}
              >
                <option value="">Choose one</option>
                {(q.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {q.type === "yesno" && (
              <select
                id={id}
                name={name}
                required={q.required}
                defaultValue={answers[q.id] ?? ""}
                className={field}
              >
                <option value="">Choose one</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
