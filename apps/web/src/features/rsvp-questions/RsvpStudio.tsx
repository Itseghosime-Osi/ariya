"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { saveRsvpSettingsAction } from "./actions";
import {
  MAX_OPTIONS,
  MAX_QUESTIONS,
  QUESTION_SUGGESTIONS,
  newQuestionId,
  questionsSchema,
  type QuestionType,
  type RsvpAnswers,
  type RsvpQuestion,
} from "./model";

export interface GuestAnswers {
  guestId: string;
  name: string;
  answers: RsvpAnswers;
}

interface RsvpStudioProps {
  eventId: string;
  initialQuestions: RsvpQuestion[];
  initialRequireCard: boolean;
  replies: GuestAnswers[];
}

const CARD =
  "overflow-hidden rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";
const FIELD =
  "desk-field min-h-[44px] w-full rounded-2xl px-4 text-base text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none sm:text-sm";
const ICON_BTN =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-label-2 transition-colors hover:bg-burgundy/10 hover:text-burgundy disabled:opacity-35 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

const TYPE_LABEL: Record<QuestionType, string> = {
  text: "Short answer",
  choice: "Pick one",
  yesno: "Yes or no",
};

export function RsvpStudio({
  eventId,
  initialQuestions,
  initialRequireCard,
  replies,
}: RsvpStudioProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [requireCard, setRequireCard] = useState(initialRequireCard);
  const [saved, setSaved] = useState(() =>
    JSON.stringify([initialQuestions, initialRequireCard])
  );
  const [busy, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const dirty = JSON.stringify([questions, requireCard]) !== saved;
  const full = questions.length >= MAX_QUESTIONS;

  const change = (next: RsvpQuestion[]) => {
    setQuestions(next);
    setNotice(null);
  };
  const patch = (id: string, p: Partial<RsvpQuestion>) =>
    change(questions.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const move = (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= questions.length) return;
    const next = [...questions];
    [next[index], next[to]] = [next[to], next[index]];
    change(next);
  };
  const add = (base?: Omit<RsvpQuestion, "id">) =>
    change([
      ...questions,
      {
        id: newQuestionId(questions),
        ...(base ?? { label: "", type: "text" as const, required: false }),
      },
    ]);
  const setType = (q: RsvpQuestion, type: QuestionType) =>
    patch(q.id, {
      type,
      options: type === "choice" ? (q.options ?? ["", ""]) : undefined,
    });

  const save = () => {
    const cleaned = questions.map((q) =>
      q.type === "choice"
        ? { ...q, options: (q.options ?? []).filter((o) => o.trim()) }
        : { ...q, options: undefined }
    );
    const check = questionsSchema.safeParse(cleaned);
    if (!check.success) {
      setNotice({
        ok: false,
        text: check.error.issues[0]?.message ?? "Check the questions",
      });
      return;
    }
    startTransition(async () => {
      const res = await saveRsvpSettingsAction(eventId, {
        questions: check.data,
        requireAccessCard: requireCard,
      });
      if (!res.ok) {
        setNotice({ ok: false, text: res.error });
        return;
      }
      setQuestions(check.data);
      setSaved(JSON.stringify([check.data, requireCard]));
      setNotice({ ok: true, text: "Saved. Guests see this when they reply." });
      router.refresh();
    });
  };

  const byId = new Map(questions.map((q) => [q.id, q]));

  return (
    <div className="space-y-4">
      <section className="profile-card relative overflow-hidden rounded-3xl p-4 sm:p-5">
        <p className={EYEBROW}>Access card</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-[#fff6dc]">
              Give each guest a personal card
            </span>
            <span className="block text-[12px] text-champagne/65">
              {requireCard
                ? "An accepted guest gets a QR and code only they can use. Each seat is admitted once."
                : "No cards. Your team checks guests in by name."}
            </span>
          </span>
          <Switch
            on={requireCard}
            onChange={(on) => {
              setRequireCard(on);
              setNotice(null);
            }}
            label="Give each guest an access card"
          />
        </div>
      </section>

      <section className={CARD}>
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <div>
            <p className={EYEBROW}>Questions</p>
            <p className="mt-0.5 text-[12px] text-label-2">
              Asked when a guest says yes. {questions.length} of {MAX_QUESTIONS}
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => add()}
            disabled={full}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-burgundy px-4 text-[13px] font-semibold text-ivory disabled:opacity-40"
          >
            <Icon name="add_circle" size={16} />
            Add
          </button>
        </div>

        {questions.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-label-2 sm:px-5">
            No questions yet. Guests will only confirm they are coming.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {questions.map((q, i) => (
              <li key={q.id} className="space-y-2.5 px-4 py-3.5 sm:px-5">
                <div className="flex items-start gap-2">
                  <input
                    aria-label={`Question ${i + 1}`}
                    value={q.label}
                    maxLength={120}
                    placeholder="Write your question"
                    onChange={(e) => patch(q.id, { label: e.target.value })}
                    className={FIELD}
                  />
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className={ICON_BTN}
                  >
                    <Icon name="expand_less" size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === questions.length - 1}
                    onClick={() => move(i, 1)}
                    className={ICON_BTN}
                  >
                    <Icon name="expand_more" size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove question ${i + 1}`}
                    onClick={() =>
                      change(questions.filter((x) => x.id !== q.id))
                    }
                    className={ICON_BTN}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={q.type === t}
                      onClick={() => setType(q, t)}
                      className={`desk-chip min-h-9 rounded-full px-3 text-[12px] font-semibold ${
                        q.type === t ? "bg-burgundy text-ivory" : "text-label-2"
                      }`}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                  <label className="ml-auto flex items-center gap-2 text-[12px] text-label-2">
                    Required
                    <Switch
                      on={q.required}
                      onChange={(on) => patch(q.id, { required: on })}
                      label={`Question ${i + 1} is required`}
                    />
                  </label>
                </div>

                {q.type === "choice" && (
                  <div className="space-y-2">
                    {(q.options ?? []).map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          aria-label={`Choice ${oi + 1}`}
                          value={o}
                          maxLength={40}
                          placeholder={`Choice ${oi + 1}`}
                          onChange={(e) =>
                            patch(q.id, {
                              options: (q.options ?? []).map((x, xi) =>
                                xi === oi ? e.target.value : x
                              ),
                            })
                          }
                          className={FIELD}
                        />
                        <button
                          type="button"
                          aria-label={`Remove choice ${oi + 1}`}
                          disabled={(q.options ?? []).length <= 2}
                          onClick={() =>
                            patch(q.id, {
                              options: (q.options ?? []).filter(
                                (_, xi) => xi !== oi
                              ),
                            })
                          }
                          className={ICON_BTN}
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                    ))}
                    {(q.options ?? []).length < MAX_OPTIONS && (
                      <button
                        type="button"
                        onClick={() =>
                          patch(q.id, { options: [...(q.options ?? []), ""] })
                        }
                        className="text-[12px] font-semibold text-burgundy"
                      >
                        + Add a choice
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {!full && (
          <div className="border-t border-hairline px-4 py-3.5 sm:px-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-label-2">
              Quick adds
            </p>
            <div className="flex flex-wrap gap-2">
              {QUESTION_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => add(s)}
                  className="desk-chip min-h-9 rounded-full px-3 text-[12px] text-label-2"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className={CARD}>
        <div className="px-4 pt-4 sm:px-5">
          <p className={EYEBROW}>Answers so far</p>
        </div>
        {replies.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-label-2 sm:px-5">
            Answers appear here as guests reply.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {replies.map((r) => (
              <li key={r.guestId} className="px-4 py-3 sm:px-5">
                <p className="text-[14px] font-semibold text-night">{r.name}</p>
                <dl className="mt-1 space-y-0.5">
                  {Object.entries(r.answers).map(([id, a]) => (
                    <div key={id} className="text-[12px] text-label-2">
                      <dt className="inline">
                        {byId.get(id)?.label ?? "Removed question"}:{" "}
                      </dt>
                      <dd className="inline font-medium text-night">{a}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sticky bottom-3 z-10 rounded-full border border-hairline bg-surface/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <p
            role="status"
            className={`min-w-0 flex-1 text-[12px] ${
              notice
                ? notice.ok
                  ? "text-emerald-700"
                  : "text-red-700"
                : "text-label-2"
            }`}
          >
            {notice?.text ?? (dirty ? "Unsaved changes" : "All saved")}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-5 text-[13px] font-semibold text-ivory disabled:opacity-40"
          >
            <Icon name={busy ? "refresh" : "check"} size={16} />
            {busy ? "Saving" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
