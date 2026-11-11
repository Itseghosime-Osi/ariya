"use client";

import { Wand2 } from "lucide-react";
import type { SeatPlan, SeatUnit } from "../autoseat";
import { Section } from "../studio-ui";

// ---------------------------------------------------------------- seat

export function SeatPanel({
  plan,
  units,
  readiness,
  busy,
  onSeat,
}: {
  plan: SeatPlan;
  units: SeatUnit[];
  readiness: number;
  busy: string | null;
  onSeat: () => void;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div>
      <Section title="Seat everyone">
        <div className="flex items-center gap-4">
          <svg
            width="84"
            height="84"
            viewBox="0 0 84 84"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle
              cx="42"
              cy="42"
              r={r}
              fill="none"
              stroke="#efe7da"
              strokeWidth="8"
            />
            <circle
              cx="42"
              cy="42"
              r={r}
              fill="none"
              stroke="#6e1426"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(c * readiness) / 100} ${c}`}
              transform="rotate(-90 42 42)"
              className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none"
            />
            <text
              x="42"
              y="47"
              textAnchor="middle"
              className="fill-night font-display text-[18px] font-bold"
            >
              {readiness}%
            </text>
          </svg>
          <p className="text-sm text-night">
            Seats confirmed guests with no table. Families stay together, VIPs
            go to the high table and the front, and no table goes over its
            seats.
          </p>
        </div>
        <ul className="mt-3 space-y-1.5 rounded-xl bg-[#f6f1e8] p-3 text-sm text-night">
          <li>
            <strong>{plan.assignments.length}</strong> of {units.length}{" "}
            accepted invitations without a table can be seated
          </li>
          {plan.split.length > 0 && (
            <li>
              {plan.split.length}{" "}
              {plan.split.length === 1 ? "group spreads" : "groups spread"} over
              neighbouring tables: {plan.split.slice(0, 3).join(", ")}
            </li>
          )}
          {plan.unplaced.length > 0 && (
            <li className="text-[#9e2a2b]">
              {plan.unplaced.length} need more seats:{" "}
              {plan.unplaced
                .slice(0, 3)
                .map((u) => `${u.name} (${u.seats})`)
                .join(", ")}
              . Add tables with Fit.
            </li>
          )}
        </ul>
        <button
          type="button"
          disabled={busy !== null || plan.assignments.length === 0}
          onClick={onSeat}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory transition-colors hover:bg-wine disabled:bg-[#eadfd9] disabled:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Wand2 size={15} aria-hidden="true" />
          {busy === "seat"
            ? "Seating guests…"
            : units.length === 0
              ? "Everyone who accepted is seated"
              : `Seat ${plan.assignments.length} guests`}
        </button>
        <p className="mt-2 text-[11px] text-label-2">
          Pending replies wait until they accept. You can move anyone
          afterwards.
        </p>
      </Section>
    </div>
  );
}
