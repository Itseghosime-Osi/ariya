import React from "react";
import { MonogramSeal } from "@/features/events/components/desk/MonogramSeal";

export const ERROR_PRIMARY =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-burgundy px-6 text-[14px] font-semibold text-ivory shadow-[0_8px_20px_-8px_rgba(110,20,38,0.6)] transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";
export const ERROR_SECONDARY =
  "desk-chip inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-semibold text-burgundy transition-colors hover:bg-burgundy/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

interface ErrorScreenProps {
  /** A big numeral such as "404". Leave it out for errors that have no number. */
  code?: string;
  /** The small gold line above the title. */
  eyebrow: string;
  title: string;
  message: string;
  /** The buttons: links or buttons styled with ERROR_PRIMARY and ERROR_SECONDARY. */
  actions: React.ReactNode;
  /** An error's digest, so a person can quote it when they ask for help. */
  reference?: string;
  /** "page" fills the screen; "inline" sits inside the app's own layout. */
  layout?: "page" | "inline";
  /** Set on error boundaries so screen readers announce it. */
  alert?: boolean;
  testId?: string;
}

/**
 * One look for every page that has nothing to show: the missing-page screens and the error screens.
 * An ivory stage with a soft glow, the wax seal, a gold numeral, then what happened and where to go
 * next. It is plain markup (no hooks), so server and client files can both render it.
 */
export function ErrorScreen({
  code,
  eyebrow,
  title,
  message,
  actions,
  reference,
  layout = "page",
  alert = false,
  testId,
}: ErrorScreenProps) {
  const page = layout === "page";
  return (
    <div
      role={alert ? "alert" : undefined}
      data-testid={testId}
      className={`relative isolate flex items-center justify-center px-4 ${
        page ? "min-h-[100dvh] bg-ivory py-12" : "py-12 sm:py-20"
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          // Both glows sit inside the box and fade to nothing before its edges, so the light never
          // ends in a line. Extra stops ease the fall-off.
          background: [
            "radial-gradient(ellipse 52% 48% at 50% 38%, rgba(110,20,38,0.10) 0%, rgba(110,20,38,0.055) 35%, rgba(110,20,38,0.02) 65%, transparent 100%)",
            "radial-gradient(ellipse 42% 36% at 50% 72%, rgba(212,168,90,0.16) 0%, rgba(212,168,90,0.07) 40%, transparent 100%)",
          ].join(", "),
        }}
      />

      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-fit">
          <MonogramSeal text="À" size={64} className="drop-shadow-md" />
        </div>

        {code && (
          <p
            aria-hidden="true"
            className="mt-4 bg-gradient-to-b from-[#d4a85a] to-[#8a5a14] bg-clip-text font-display text-[5.5rem] font-semibold leading-none tracking-tight text-transparent sm:text-[7rem]"
          >
            {code}
          </p>
        )}

        <p
          className={`text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink ${
            code ? "mt-2" : "mt-5"
          }`}
        >
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-[1.9rem] font-semibold leading-tight text-night sm:text-[2.3rem]">
          {title}
        </h1>

        <div
          aria-hidden="true"
          className="mx-auto mt-4 flex w-40 items-center gap-2 text-gold-ink"
        >
          <span className="h-px flex-1 bg-current opacity-40" />
          <span className="text-[11px] leading-none">✦</span>
          <span className="h-px flex-1 bg-current opacity-40" />
        </div>

        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-label-2">
          {message}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>

        {reference && (
          <p className="mt-6 text-[11px] text-label-2">
            Reference{" "}
            <span className="rounded-full border border-hairline px-2 py-0.5 font-mono">
              {reference}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
