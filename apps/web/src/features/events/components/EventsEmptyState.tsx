import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const STEPS = [
  { num: "1", label: "Create event" },
  { num: "2", label: "Add guests" },
  { num: "3", label: "Send invitations" },
];

export function EventsEmptyState() {
  return (
    <section
      data-testid="empty-events-state"
      className="bento-card relative overflow-hidden px-6 py-10 sm:px-12 sm:py-16 text-center"
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05] text-burgundy"
      >
        <defs>
          <pattern
            id="adire-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48 M 24 0 L 24 48 M 0 24 L 48 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle cx="24" cy="24" r="6" fill="none" stroke="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#adire-grid)" />
      </svg>

      <div className="relative mx-auto max-w-xl space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-burgundy/10 text-burgundy">
          <Icon name="celebration" size={24} />
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-night">
            Plan your first àríyá
          </h2>
          <p className="text-sm text-label-2 max-w-md mx-auto">
            Set up your celebration, organise your guest list and tables, and
            track every reply in one calm workspace.
          </p>
        </div>

        <ol
          aria-label="Steps to get started"
          className="flex flex-wrap items-center justify-center gap-2.5 pt-1"
        >
          {STEPS.map((step) => (
            <li
              key={step.num}
              data-testid={`empty-step-${step.num}`}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-ivory/80 px-4 py-2 text-xs font-semibold text-night"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-burgundy text-[11px] font-bold text-white tabular-nums">
                {step.num}
              </span>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>

        <div className="pt-2">
          <Link
            href="/events/new"
            data-testid="empty-create-event"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-burgundy px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(107,30,46,0.45)] transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="add_circle" size={18} />
            <span>New event</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
