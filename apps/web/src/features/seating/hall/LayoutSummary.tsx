"use client";

import { VENUE_LABEL, type HallLayout } from "./model";
import type { SceneTable } from "./Hall3D";

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The hall in words: the same layout the 3D view draws, as a summary and a table list.
 *
 * This is the non-visual equivalent, not a fallback. A host who cannot see the room, or who is
 * reading on a phone, gets the venue, the size, every table with its seats, and every area, in
 * the same order the plan is drawn.
 */
export function LayoutSummary({
  layout,
  tables,
  onFocus,
}: {
  layout: HallLayout;
  tables: SceneTable[];
  onFocus?: (id: string) => void;
}) {
  const seats = tables.reduce((sum, t) => sum + t.capacity, 0);
  const taken = tables.reduce((sum, t) => sum + (t.occupied ?? 0), 0);
  const venue = VENUE_LABEL[layout.venue.type];

  return (
    <section
      aria-labelledby="layout-summary-heading"
      className="rounded-2xl border border-hairline bg-white/70 p-4"
    >
      <h2
        id="layout-summary-heading"
        className="text-sm font-semibold text-night"
      >
        The room in words
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-label-2">
        A {venue.toLowerCase()}, {round1(layout.width)} by{" "}
        {round1(layout.length)} metres, set for {tables.length}{" "}
        {tables.length === 1 ? "table" : "tables"}. {taken} of {seats} seats are
        taken
        {layout.zones.length > 0
          ? `, with ${layout.zones.length} ${
              layout.zones.length === 1 ? "area" : "areas"
            } marked out`
          : ""}
        .
      </p>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-label-2">
        Tables
      </h3>
      {tables.length === 0 ? (
        <p className="mt-1 text-sm text-label-2">No tables yet.</p>
      ) : (
        <ul className="mt-1 divide-y divide-hairline">
          {tables.map((t) => (
            <li key={t.id} className="flex items-baseline gap-3 py-1.5">
              <button
                type="button"
                onClick={() => onFocus?.(t.id)}
                className="min-w-0 flex-1 truncate text-left text-sm text-night underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                {t.name}
              </button>
              <span className="shrink-0 text-xs tabular-nums text-label-2">
                {t.occupied} of {t.capacity} seats
              </span>
              <span className="shrink-0 text-xs tabular-nums text-label-2">
                {round1(t.x)} m across, {round1(t.y)} m in
              </span>
            </li>
          ))}
        </ul>
      )}

      {layout.zones.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-label-2">
            Areas
          </h3>
          <ul className="mt-1 divide-y divide-hairline">
            {layout.zones.map((z) => (
              <li key={z.id} className="flex items-baseline gap-3 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm text-night">
                  {z.label || z.kind}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-label-2">
                  {round1(z.w)} by {round1(z.h)} m
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
