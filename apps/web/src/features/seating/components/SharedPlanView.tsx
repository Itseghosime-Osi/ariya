"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { HallPlan } from "@/features/approvals/components/HallPlan";
import { buildFloorPlanPdf } from "../hall/floorplan-pdf";
import type { SharedPlan } from "../share-queries";

/**
 * What a venue manager or caterer sees through a view-only link: the room from above, drawn by
 * the studio's own renderer, its size and tables, and a measured PDF to print. Nothing can be
 * changed here, and no guest is named.
 */
export function SharedPlanView({ plan }: { plan: SharedPlan }) {
  const [busy, setBusy] = useState(false);
  const seats = plan.tables.reduce((a, t) => a + t.capacity, 0);
  const when = new Date(plan.date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const download = async () => {
    setBusy(true);
    try {
      const bytes = await buildFloorPlanPdf({
        title: plan.title,
        subtitle: `${plan.venue} · ${when}`,
        layout: plan.layout,
        tables: plan.tables.map((t) => ({
          name: t.name,
          shape: t.shape,
          capacity: t.capacity,
          x: t.x / 100,
          y: t.y / 100,
          rot: plan.layout.rotations[t.id] ?? 0,
        })),
      });
      const url = URL.createObjectURL(
        new Blob([bytes as BlobPart], { type: "application/pdf" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "floor-plan.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
        Floor plan · view only
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-night">
        {plan.title}
      </h1>
      <p className="mt-1 text-sm text-label-2">
        {plan.venue} · {when}
      </p>

      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          ["Hall", `${plan.layout.width} × ${plan.layout.length} m`],
          ["Tables", String(plan.tables.length)],
          ["Seats", String(seats)],
        ].map(([k, v]) => (
          <div
            key={k}
            className="rounded-2xl border border-hairline bg-white p-3"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-label-2">
              {k}
            </dt>
            <dd className="mt-1 font-display text-xl font-bold text-night">
              {v}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-label="The room from above" className="mt-4">
        <HallPlan
          preview={{
            kind: "hall",
            proposed: { layout: plan.layout, tables: plan.tables },
            current: { layout: null, tables: [] },
            changes: [],
            problems: [],
          }}
        />
      </section>

      <button
        type="button"
        onClick={() => void download()}
        disabled={busy}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory hover:bg-wine disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <Download size={16} aria-hidden="true" />
        {busy ? "Preparing…" : "Download the measured floor plan (PDF)"}
      </button>

      <section className="mt-8" aria-labelledby="areas-h">
        <h2 id="areas-h" className="font-display text-lg font-bold text-night">
          Areas
        </h2>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {plan.layout.zones.map((z) => (
            <li
              key={z.id}
              className="flex justify-between rounded-xl border border-hairline bg-white px-3 py-2 text-sm"
            >
              <span className="font-semibold text-night">{z.label}</span>
              <span className="text-label-2">
                {z.w} × {z.h} m
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="tables-h">
        <h2 id="tables-h" className="font-display text-lg font-bold text-night">
          Tables
        </h2>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
          {plan.tables.map((t) => (
            <li
              key={t.id}
              className="flex justify-between rounded-xl border border-hairline bg-white px-3 py-2 text-sm"
            >
              <span className="font-semibold text-night">{t.name}</span>
              <span className="text-label-2">{t.capacity} seats</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-xs text-label-2">
        Shared from Àríyá by the hosts. This link shows the room and tables
        only, never guest names, and stops working as soon as they stop sharing.
      </p>
    </main>
  );
}
