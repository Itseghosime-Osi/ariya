"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/ui/icon";
import { MonogramSeal } from "@/features/events/components/desk/MonogramSeal";
import { daysBetweenLagos } from "@/lib/format";
import {
  buildTimeline,
  stepAt,
  type FilmDesign,
  type TimelineStep,
} from "./design";

export interface FilmEvent {
  couple: string;
  title: string;
  date: string;
  venue: string;
  area: string | null;
  dressCode: string | null;
}

interface EventFilmProps {
  design: FilmDesign;
  event: FilmEvent;
  /** A guest's full name on their personal link: it adds the three-second "For {name}" opening. */
  guestName?: string | null;
  /** The invitation card, shown for the last six seconds. */
  finale: React.ReactNode;
  /** What the button under the card says. */
  ctaLabel?: string;
  /** Called by the button under the card, by Escape and by closing; the film is over. */
  onClose: () => void;
}

const DUST = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37) % 100,
  s: 2 + ((i * 5) % 4),
  t: 9 + ((i * 7) % 8),
  d: -((i * 3) % 11),
  w: ((i * 29) % 90) - 45,
}));

const lagos = (opts: Intl.DateTimeFormatOptions, date: Date) =>
  new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    ...opts,
  }).format(date);

function Letters({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ "--i": i } as React.CSSProperties}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

function SceneBody({
  step,
  design,
  event,
  guestName,
  finale,
  ctaLabel,
  onClose,
}: {
  step: TimelineStep;
  design: FilmDesign;
  event: FilmEvent;
  guestName?: string | null;
  finale: React.ReactNode;
  ctaLabel: string;
  onClose: () => void;
}) {
  const when = new Date(event.date);
  const valid = !Number.isNaN(when.getTime());
  const names = event.couple || event.title;

  switch (step.kind) {
    case "intro":
      return (
        <>
          <div className="efilm-kicker">For</div>
          <div className="efilm-big efilm-name">
            <Letters text={guestName ?? ""} />
          </div>
          <div className="efilm-rule" />
          <p className="efilm-line">You are invited.</p>
        </>
      );
    case "welcome":
      return (
        <div
          className="efilm-plate"
          style={{ display: "grid", gap: 14, justifyItems: "center" }}
        >
          <MonogramSeal text={names} size={74} className="efilm-seal" />
          <div className="efilm-big efilm-name">
            <Letters text={names} />
          </div>
          <div className="efilm-rule" />
          {step.text && <p className="efilm-line">{step.text}</p>}
        </div>
      );
    case "celebrant": {
      const parts = names.split(/\s*(?:&|\band\b)\s*/i).filter(Boolean);
      return (
        <>
          <div className="efilm-photos">
            {design.photos.length > 0
              ? design.photos.map((photo, i) => (
                  <figure
                    key={photo.url}
                    className="efilm-photo"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.caption || names} />
                    {photo.caption && <figcaption>{photo.caption}</figcaption>}
                  </figure>
                ))
              : parts.slice(0, 2).map((part, i) => (
                  <div
                    key={part}
                    className="efilm-photo"
                    style={
                      {
                        "--i": i,
                        display: "grid",
                        placeItems: "center",
                      } as React.CSSProperties
                    }
                  >
                    <MonogramSeal text={part} size={84} />
                    <figcaption>{part}</figcaption>
                  </div>
                ))}
          </div>
          {step.text && <p className="efilm-line">{step.text}</p>}
        </>
      );
    }
    case "when":
      return (
        <>
          <div className="efilm-kicker">Save the date</div>
          {valid ? (
            <div className="efilm-cal">
              <b>{lagos({ month: "long" }, when)}</b>
              <strong>{lagos({ day: "numeric" }, when)}</strong>
              <span>
                {lagos({ weekday: "long" }, when)} ·{" "}
                {lagos({ year: "numeric" }, when)}
              </span>
            </div>
          ) : (
            <p className="efilm-mid">The date is coming soon</p>
          )}
          {valid && (
            <p className="efilm-line">
              {lagos({ hour: "numeric", minute: "2-digit" }, when)}
            </p>
          )}
        </>
      );
    case "where":
      return (
        <>
          <div className="efilm-kicker">Where</div>
          <div className="efilm-pin" aria-hidden="true">
            <i />
            <i />
            <svg width="44" height="54" viewBox="0 0 24 30" fill="none">
              <path
                d="M12 1c5.5 0 10 4.2 10 9.6C22 18 12 29 12 29S2 18 2 10.6C2 5.2 6.5 1 12 1z"
                fill="var(--ac)"
              />
              <circle cx="12" cy="10.5" r="3.6" fill="var(--bg)" />
            </svg>
          </div>
          <div className="efilm-mid">{event.venue}</div>
          {event.area && <p className="efilm-line">{event.area}</p>}
        </>
      );
    case "message":
      return (
        <>
          <div className="efilm-kicker">A word from us</div>
          <blockquote className="efilm-quote">
            {step.text || "We cannot wait to celebrate with you."}
          </blockquote>
        </>
      );
    case "dress":
      return (
        <>
          <div className="efilm-kicker">Aṣọ-ẹbí</div>
          <div className="efilm-discs" aria-hidden="true">
            <div
              className="efilm-disc"
              style={
                {
                  "--i": 0,
                  background: design.colors.background,
                } as React.CSSProperties
              }
            />
            <div
              className="efilm-disc"
              style={
                {
                  "--i": 1,
                  background: design.colors.accent,
                } as React.CSSProperties
              }
            />
          </div>
          <p className="efilm-line">
            {event.dressCode || "Wear our colours and come ready to dance."}
          </p>
        </>
      );
    case "countdown": {
      const days = valid ? daysBetweenLagos(event.date, new Date()) : NaN;
      return (
        <>
          <div className="efilm-kicker">Not long now</div>
          {Number.isFinite(days) && days > 0 ? (
            <>
              <div className="efilm-big efilm-name">
                <Letters text={String(days)} />
              </div>
              <p className="efilm-mid">
                {days === 1 ? "day to go" : "days to go"}
              </p>
            </>
          ) : (
            <div className="efilm-big efilm-name">
              <Letters text={days === 0 ? "Today" : "Soon"} />
            </div>
          )}
        </>
      );
    }
    case "finale":
      return (
        <>
          <div className="efilm-card">{finale}</div>
          <button type="button" className="efilm-cta" onClick={onClose}>
            {ctaLabel}
            <Icon name="arrow_forward" size={18} />
          </button>
        </>
      );
  }
}

/**
 * The film: a tap to open (a song needs one), then up to 45 seconds of scenes in the host's colours,
 * ending on the invitation card. Everything is on the page's own stage, in CSS 3D, so it runs
 * smoothly on a phone and adds nothing heavy to the guest's link.
 */
export function EventFilm({
  design,
  event,
  guestName,
  finale,
  ctaLabel = "Open the invitation",
  onClose,
}: EventFilmProps) {
  const personal = Boolean(guestName?.trim());
  const { steps, total } = useMemo(
    () => buildTimeline(design, { personal }),
    [design, personal]
  );
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [index, setIndex] = useState(0);
  const clock = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastIndex = steps.length - 1;
  const step = steps[index];

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    onClose();
  }, [onClose]);

  // The page behind the film stays put while it plays.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // One clock walks the timeline; nothing else decides which scene is on screen.
  useEffect(() => {
    if (!started || paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      clock.current = Math.min(total, clock.current + dt);
      const next = stepAt(steps, clock.current).index;
      setIndex((cur) => (cur === next ? cur : next));
      if (clock.current < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, paused, steps, total]);

  // The song fades away once the film has ended, so the card is not left under a long track.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || index !== lastIndex || !started) return;
    const id = window.setTimeout(
      () => {
        let v = audio.volume;
        const fade = window.setInterval(() => {
          v = Math.max(0, v - 0.05);
          audio.volume = v;
          if (v <= 0) {
            audio.pause();
            window.clearInterval(fade);
          }
        }, 120);
      },
      (steps[lastIndex].end - steps[lastIndex].start) * 1000
    );
    return () => window.clearTimeout(id);
  }, [index, lastIndex, started, steps]);

  const start = () => {
    setStarted(true);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 0.9;
      void audio.play().catch(() => undefined);
    }
  };

  const togglePause = () => {
    const audio = audioRef.current;
    setPaused((p) => {
      if (audio) {
        if (p) void audio.play().catch(() => undefined);
        else audio.pause();
      }
      return !p;
    });
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    setMuted((m) => {
      if (audio) audio.muted = !m;
      return !m;
    });
  };

  const skip = () => {
    clock.current = steps[lastIndex].start;
    setIndex(lastIndex);
    setPaused(false);
  };

  const names = event.couple || event.title;

  return (
    <div
      className="efilm"
      role="dialog"
      aria-modal="true"
      aria-label={`${names}: the film`}
      data-paused={paused ? "true" : "false"}
      style={
        {
          "--bg": design.colors.background,
          "--ac": design.colors.accent,
        } as React.CSSProperties
      }
    >
      {design.song.url && (
        <audio ref={audioRef} src={design.song.url} preload="auto" />
      )}

      <div className="efilm-dust" aria-hidden="true">
        {DUST.map((d, i) => (
          <i
            key={i}
            style={
              {
                "--x": d.x,
                "--s": `${d.s}px`,
                "--t": `${d.t}s`,
                "--d": `${d.d}s`,
                "--w": d.w,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {!started ? (
        <div className="efilm-gate">
          <MonogramSeal text={names} size={96} className="efilm-seal" />
          <div className="efilm-kicker">
            {personal ? `For ${guestName}` : "You are invited"}
          </div>
          <div className="efilm-big">{names}</div>
          <button type="button" className="efilm-cta" onClick={start} autoFocus>
            <Icon name="celebration" size={18} />
            Tap to open
          </button>
          <button type="button" className="efilm-btn" onClick={close}>
            Skip the film
          </button>
        </div>
      ) : (
        <>
          <div className="efilm-top" aria-hidden="true">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className="efilm-seg"
                data-state={i < index ? "done" : i === index ? "now" : "next"}
                style={{ "--d": s.end - s.start } as React.CSSProperties}
              >
                <i />
              </div>
            ))}
          </div>

          <div className="efilm-stage">
            <div
              key={step.id}
              className="efilm-scene"
              data-last={index === lastIndex ? "true" : "false"}
              style={{ "--d": step.end - step.start } as React.CSSProperties}
              aria-live="polite"
            >
              <SceneBody
                step={step}
                design={design}
                event={event}
                guestName={guestName}
                finale={finale}
                ctaLabel={ctaLabel}
                onClose={close}
              />
            </div>
          </div>

          <div className="efilm-bar">
            <div style={{ display: "flex", gap: 8 }}>
              {design.song.url && (
                <button
                  type="button"
                  className="efilm-btn"
                  onClick={toggleMute}
                  aria-label={
                    muted ? "Turn the sound on" : "Turn the sound off"
                  }
                  aria-pressed={muted}
                >
                  <Icon
                    name={muted ? "notifications_off" : "notifications"}
                    size={16}
                  />
                </button>
              )}
              {index !== lastIndex && (
                <button
                  type="button"
                  className="efilm-btn"
                  onClick={togglePause}
                  aria-label={paused ? "Play" : "Pause"}
                >
                  {paused ? "Play" : "Pause"}
                </button>
              )}
            </div>
            {index !== lastIndex ? (
              <button type="button" className="efilm-btn" onClick={skip}>
                Skip to the invitation
              </button>
            ) : (
              <button type="button" className="efilm-btn" onClick={close}>
                Close
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
