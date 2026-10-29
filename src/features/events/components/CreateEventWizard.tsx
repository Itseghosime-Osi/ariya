"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { createEventAction } from "../actions";
import { Eyebrow } from "./wizard/Chips";
import { LiveInvitation, type WizardStage } from "./wizard/LiveInvitation";
import {
  StepGuests,
  StepWhen,
  StepWhere,
  StepWho,
  type Draft,
} from "./wizard/Steps";
import { MonogramSeal } from "./desk/MonogramSeal";
import {
  PALETTE_CUSTOM,
  TIME_SLOTS,
  dayParts,
  daysFromToday,
  occasionOf,
  paletteOf,
  suggestedSaturday,
} from "./wizard/wizard-data";

const STEPS: {
  key: WizardStage;
  label: string;
  heading: string;
  blurb: string;
}[] = [
  {
    key: "who",
    label: "Who",
    heading: "What are we celebrating?",
    blurb: "Tap the occasion, then add the names.",
  },
  {
    key: "when",
    label: "When",
    heading: "Pick the day",
    blurb: "Saturdays are lined up. Or choose any day.",
  },
  {
    key: "where",
    label: "Where",
    heading: "Where will you gather?",
    blurb: "City, venue and your aṣọ-ẹbí colours.",
  },
  {
    key: "guests",
    label: "Guests",
    heading: "Who's coming?",
    blurb: "How the list comes in, and how big it is.",
  },
];

const INITIAL: Draft = {
  occasion: "wedding",
  name1: "",
  name2: "",
  title: "",
  ymd: "",
  slot: "afternoon",
  venue: "",
  area: "Victoria Island, Lagos",
  paletteKey: "burgundy",
  dressCode: paletteOf("burgundy").dressCode,
  parties: 200,
  intake: "csv",
};

export function CreateEventWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [peek, setPeek] = useState(false);
  // "Today" is known only in the browser, so dates are offered after the first paint.
  const [now, setNow] = useState<Date | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    const today = new Date();
    setNow(today);
    setDraft((d) => (d.ymd ? d : { ...d, ymd: suggestedSaturday(today) }));
  }, []);

  const set = useCallback(
    (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })),
    []
  );

  const occasion = occasionOf(draft.occasion);
  const palette = paletteOf(draft.paletteKey);
  const names = (
    occasion.names === 2
      ? [draft.name1, draft.name2].map((n) => n.trim()).filter(Boolean)
      : [draft.name1.trim()].filter(Boolean)
  ).join(" & ");
  const namesComplete =
    occasion.names === 2
      ? Boolean(draft.name1.trim() && draft.name2.trim())
      : Boolean(draft.name1.trim());
  const suggestions = useMemo(
    () => (namesComplete && names.length >= 3 ? occasion.titles(names) : []),
    [namesComplete, names, occasion]
  );
  const title = draft.title.trim() || suggestions[0] || "";

  const slot = TIME_SLOTS.find((s) => s.key === draft.slot) ?? TIME_SLOTS[1];
  const date = draft.ymd ? `${draft.ymd}T${slot.hm}` : "";
  const parts = dayParts(draft.ymd);
  const daysAway = now ? daysFromToday(draft.ymd, now) : null;

  const valid = [
    namesComplete && names.length >= 3 && title.length >= 3,
    Boolean(draft.ymd),
    draft.venue.trim().length >= 2,
    true,
  ];
  const reachable = (i: number) => valid.slice(0, i).every(Boolean);

  const goTo = (i: number) => {
    if (i < 0 || i >= STEPS.length || !reachable(i)) return;
    moved.current = true;
    setDir(i < step ? "back" : "forward");
    setErrorMessage(null);
    setStep(i);
  };

  // Move focus to the new step's heading, so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [step]);

  const launch = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await createEventAction({
        title,
        couple: names,
        date,
        venue: draft.venue.trim(),
        area: draft.area.trim(),
        dressCode: draft.dressCode.trim(),
        targetParties: draft.parties,
        intakeMethod: draft.intake,
      });
      if (!result.ok) {
        setErrorMessage(result.error);
      } else if (result.data) {
        router.push(`/events/${result.data.eventId}?created=1`);
      }
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid[step]) return;
    if (step < STEPS.length - 1) goTo(step + 1);
    else launch();
  };

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const dressCode =
    draft.paletteKey === PALETTE_CUSTOM
      ? draft.dressCode.trim()
      : palette.dressCode;
  const preview = (
    <LiveInvitation
      occasion={occasion}
      names={names}
      parts={
        occasion.names === 2
          ? [draft.name1, draft.name2].map((n) => n.trim()).filter(Boolean)
          : [draft.name1.trim()].filter(Boolean)
      }
      dateLabel={
        parts ? `${parts.weekday} ${parts.day} ${parts.monthShort}` : ""
      }
      timeLabel={slot.clock}
      venue={draft.venue}
      area={draft.area}
      dressCode={dressCode}
      palette={palette}
      stage={current.key}
      parties={draft.parties}
    />
  );

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <header className="mb-6 sm:mb-8">
        <Link
          href="/events"
          className="inline-flex min-h-11 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Icon name="arrow_back" size={14} />
          Back to your events
        </Link>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-night sm:text-4xl">
          Plan your celebration
        </h1>
      </header>

      <nav aria-label="Setup steps" className="mb-6">
        <ol className="grid grid-cols-4 gap-2 sm:gap-3">
          {STEPS.map((s, i) => {
            const done = i < step && valid[i];
            const here = i === step;
            const open = reachable(i);
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={!open}
                  aria-current={here ? "step" : undefined}
                  data-testid={`wizard-step-${s.key}`}
                  className="group flex min-h-11 w-full flex-col gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy disabled:cursor-not-allowed"
                >
                  <span
                    className={cn(
                      "h-1.5 w-full overflow-hidden rounded-full bg-gold-ink/15"
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        "weave-fill block h-full rounded-full transition-[width] duration-500 ease-out",
                        here || done ? "w-full" : "w-0"
                      )}
                    />
                  </span>
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors",
                        here
                          ? "bg-burgundy text-champagne"
                          : done
                            ? "bg-rsvp-accepted text-white"
                            : "bg-gold-ink/15 text-label-2"
                      )}
                    >
                      {done ? <Icon name="check" size={13} /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.06em] sm:text-xs sm:tracking-[0.14em]",
                        here ? "text-night" : "text-label-2"
                      )}
                    >
                      {s.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Phones: the invitation folds away until you want to peek at it. */}
      <div className="mb-5 lg:hidden">
        <button
          type="button"
          onClick={() => setPeek((p) => !p)}
          aria-expanded={peek}
          aria-controls="invitation-peek"
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-gold-ink/25 bg-[#1c070d] px-4 py-2 text-left text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <MonogramSeal text={names || "À"} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-champagne">
              Your invitation
            </span>
            <span className="block truncate font-display text-base">
              {names || "Takes shape as you go"}
            </span>
          </span>
          <Icon
            name={peek ? "expand_less" : "expand_more"}
            size={18}
            className="shrink-0 text-champagne"
          />
        </button>
        {peek && (
          <div
            id="invitation-peek"
            className="mt-3 flex justify-center overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_50%_30%,#3a0f1a,#1c070d_70%)] p-5"
          >
            {preview}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form
          onSubmit={onSubmit}
          noValidate
          className="bento-card p-5 sm:p-8"
          aria-labelledby="wizard-heading"
        >
          <Eyebrow>{`Step ${step + 1} of ${STEPS.length}`}</Eyebrow>
          <h2
            id="wizard-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 font-display text-2xl font-bold text-night outline-none sm:text-3xl"
          >
            {current.heading}
          </h2>
          <p className="mb-6 mt-1 text-sm text-label-2">{current.blurb}</p>

          {errorMessage && (
            <div
              className="mb-6 flex items-start gap-3 rounded-2xl bg-error-container/80 p-4"
              role="alert"
            >
              <Icon
                name="error"
                size={18}
                className="mt-0.5 shrink-0 text-error"
              />
              <p className="text-sm text-on-error-container">{errorMessage}</p>
            </div>
          )}

          <div key={current.key} className="wiz-in" data-dir={dir}>
            {step === 0 && (
              <StepWho draft={draft} set={set} suggestions={suggestions} />
            )}
            {step === 1 && (
              <StepWhen draft={draft} set={set} now={now} daysAway={daysAway} />
            )}
            {step === 2 && <StepWhere draft={draft} set={set} />}
            {step === 3 && <StepGuests draft={draft} set={set} />}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                className="min-h-11 rounded-full border border-gold-ink/25 bg-white/70 px-5 text-xs font-semibold uppercase tracking-[0.14em] text-night transition-colors hover:border-gold-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              key={`${step}-${valid[step]}`}
              disabled={!valid[step] || isPending}
              data-testid={last ? "wizard-launch" : "wizard-next"}
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-burgundy px-6 text-xs font-semibold uppercase tracking-[0.14em] text-ivory shadow-[0_12px_28px_-14px_rgba(110,20,38,0.9)] transition-[transform,background-color,opacity] duration-150 hover:bg-wine active:scale-[0.97] enabled:animate-[wiz-ready_900ms_var(--ease-out)] motion-reduce:animate-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              {last ? (
                isPending ? (
                  <span className="animate-pulse motion-reduce:animate-none">
                    Creating…
                  </span>
                ) : (
                  <>
                    Create celebration workspace
                    <Icon name="celebration" size={16} />
                  </>
                )
              ) : (
                <>
                  {`Next: ${STEPS[step + 1].label}`}
                  <Icon
                    name="arrow_forward"
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </div>
          {!valid[step] && (
            <p className="mt-3 text-right text-xs text-label-2" role="status">
              {step === 0
                ? "Add the name or names to continue."
                : step === 1
                  ? "Choose a day to continue."
                  : "Add the venue name to continue."}
            </p>
          )}
        </form>

        {/* Desktop: the invitation stays beside you on a velvet stage. */}
        <aside
          aria-label="Invitation preview"
          className="sticky top-24 hidden lg:block"
        >
          <div className="relative overflow-hidden rounded-[32px] bg-[#1c070d] p-7 shadow-[0_30px_60px_-30px_rgba(28,7,13,0.8)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#6e1426]/60 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-[#b8864b]/25 blur-3xl"
            />
            <div aria-hidden="true" className="desk-grain absolute inset-0" />
            <div className="relative">
              <Eyebrow className="text-champagne">Your invitation</Eyebrow>
              <p className="mb-5 mt-1 line-clamp-2 font-display text-xl text-ivory [overflow-wrap:anywhere]">
                {names ? title || occasion.label : "Takes shape as you go"}
              </p>
              <div className="flex justify-center">{preview}</div>
              <p className="mt-5 text-center text-xs text-ivory/70">
                Move your pointer over the card. This is how guests will see it.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
