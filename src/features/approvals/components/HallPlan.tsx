"use client";

/**
 * The proposed room, drawn by the hall designer's own renderer and read from above.
 *
 * Nothing here draws a hall: the tables, chairs, zones and décor all come from the studio's scene,
 * so what a host judges on this card is what the studio would draw for the same document. The only
 * things this adds are that the plan cannot be touched — a proposal is read, not edited — and a
 * toggle between the room as it stands and the room being proposed.
 */

import { useMemo, useState } from "react";
import { Hall3D, type Scene } from "@/features/seating/hall/Hall3D";
import {
  chairPositions,
  chairType,
  styleOf,
  tableTop,
  type HallLayout,
} from "@/features/seating/hall/model";
import type { HallPreview, PreviewTable } from "../types";

export function HallPlan({ preview }: { preview: HallPreview }) {
  const [view, setView] = useState<"proposed" | "current">("proposed");

  const canCompare = preview.current.layout !== null;
  const shown =
    view === "current" && canCompare ? preview.current : preview.proposed;

  const scene = useMemo(
    () => (shown.layout ? sceneOf(shown.layout, shown.tables) : null),
    [shown.layout, shown.tables]
  );

  return (
    <div className="mt-3">
      {canCompare ? (
        <div
          role="group"
          aria-label="Which room to show"
          className="mb-2 inline-flex rounded-full border border-wine/15 bg-surface-container-high p-0.5"
        >
          <Toggle
            active={view === "proposed"}
            onClick={() => setView("proposed")}
            label="Proposed room"
          />
          <Toggle
            active={view === "current"}
            onClick={() => setView("current")}
            label="Room you have now"
          />
        </div>
      ) : null}

      {scene ? (
        <div className="relative overflow-hidden rounded-2xl border border-wine/10 bg-surface-container-low">
          <div className="h-[260px] w-full sm:h-[320px]">
            <Hall3D
              scene={scene}
              onMessage={ignore}
              initialView="top"
              className="relative h-full w-full"
            />
          </div>
          {/*
            A proposal is a picture, not a tool. This sits over the hall so no drag, pinch or key
            ever reaches the renderer, while the plan itself stays exactly what the studio draws.
          */}
          <div
            className="absolute inset-0 cursor-default"
            aria-hidden="true"
            data-testid="hall-plan-shield"
          />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-4 text-xs text-on-surface-variant">
          Your celebration has no saved room yet, so there is nothing to compare
          this proposal against. Approving it would create one.
        </p>
      )}

      <p className="mt-1.5 text-[11px] text-on-surface-variant">
        A to-scale plan, seen from above. Read-only.
      </p>
    </div>
  );
}

function ignore() {
  // The hall reports picks and moves; a proposal has nothing to do with either.
}

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
        active
          ? "bg-wine text-white"
          : "text-on-surface-variant hover:text-wine"
      }`}
    >
      {label}
    </button>
  );
}

/** The studio's own scene, built from one layout and the positions the proposal gives it. */
function sceneOf(layout: HallLayout, tables: PreviewTable[]): Scene {
  return {
    layout,
    tables: tables.map((table) => ({
      id: table.id,
      name: table.name,
      shape: table.shape,
      capacity: table.capacity,
      occupied: 0,
      x: table.x / 100,
      y: table.y / 100,
      rot: layout.rotations[table.id] ?? 0,
      top: tableTop(table.shape, table.capacity),
      chairs: chairPositions(table.shape, table.capacity).map((chair) => ({
        x: chair.x,
        y: chair.y,
      })),
      style: styleOf(layout, table.id),
    })),
    chairs: layout.chairs.map((chair) => ({
      id: chair.id,
      x: chair.x,
      y: chair.y,
      rot: chair.rot,
      type: chairType(chair.chair ?? layout.decor.chair),
      cover: layout.decor.cover,
      sash: layout.decor.sash,
    })),
    selection: [],
    tool: "hand",
    labels: true,
    warnings: {},
    ghosts: [],
    assigning: false,
    board: "#f7f2ea",
    inset: { left: 0, top: 0, right: 0, bottom: 0 },
  };
}
