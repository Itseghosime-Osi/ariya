import React from "react";

interface ReminderMessagePreviewProps {
  coupleName: string;
  venueName: string;
  subject: string;
  customMessage: string;
}

export function ReminderMessagePreview({
  coupleName,
  venueName,
  subject,
  customMessage,
}: ReminderMessagePreviewProps) {
  return (
    <section
      aria-label="Email preview"
      className="flex flex-col gap-4 rounded-3xl border border-outline-variant/60 bg-surface-container-low p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink">
          What guests will see
        </p>
        <span className="text-[11px] text-on-surface-variant">
          Live preview
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-ivory shadow-[0_1px_2px_rgba(28,7,13,0.04)]">
        <div className="flex flex-col gap-0.5 border-b border-outline-variant/60 px-4 py-3 text-xs">
          <p className="truncate font-semibold text-on-surface">
            {subject || "Add a subject line"}
          </p>
          <p className="truncate text-on-surface-variant">
            Àríyá Celebrations &lt;notifications@ariya.app&gt;
          </p>
        </div>

        <div className="flex flex-col gap-3 px-5 py-5 text-sm leading-relaxed text-on-surface">
          <p className="font-serif text-lg font-bold text-wine">
            Hello [Guest name],
          </p>
          <p>
            This is a gentle reminder from <strong>{coupleName}</strong>. We are
            counting down the days and putting together the table arrangements.
          </p>
          {customMessage && (
            <p className="border-l-2 border-gold pl-3 font-serif italic text-on-surface-variant">
              {customMessage}
            </p>
          )}
          <p className="text-on-surface-variant">
            Venue: <strong className="text-on-surface">{venueName}</strong>
          </p>
          <span className="mt-1 inline-block self-start rounded-full bg-wine px-5 py-2.5 text-xs font-semibold text-ivory">
            Confirm your attendance
          </span>
        </div>
      </div>
    </section>
  );
}
