"use client";

import { Moon, Sun } from "lucide-react";
import {
  CHAIR_TYPES,
  DECOR_PRESETS,
  type Centrepiece,
  type ChairType,
  type Decor,
  type HallLayout,
} from "../model";
import {
  CentrepieceGlyph,
  ChairGlyph,
  LIGHT_PALETTE,
  Section,
  Segmented,
  Swatches,
  Tiles,
  Toggle,
} from "../studio-ui";

export const CENTREPIECES: { key: Centrepiece; label: string }[] = [
  { key: "tall", label: "Tall florals" },
  { key: "low", label: "Low florals" },
  { key: "candles", label: "Candles" },
  { key: "lanterns", label: "Lanterns" },
  { key: "none", label: "None" },
];

// ---------------------------------------------------------------- décor

export function DecorPanel({
  layout,
  onDecor,
  onLayout,
  styledCount,
  onResetTables,
}: {
  layout: HallLayout;
  onDecor: (d: Decor) => void;
  onLayout: (patch: Partial<HallLayout>) => void;
  styledCount: number;
  onResetTables: () => void;
}) {
  const decor = layout.decor;
  const set = (patch: Partial<Decor>) => onDecor({ ...decor, ...patch });
  return (
    <div>
      <Section title="Mood">
        <Segmented<"day" | "evening">
          label="Mood"
          value={layout.mood}
          onPick={(v) => onLayout({ mood: v })}
          options={[
            { key: "day", label: "Daytime", icon: <Sun size={14} /> },
            { key: "evening", label: "Evening", icon: <Moon size={14} /> },
          ]}
        />
        <div className="mt-2">
          <Toggle
            label="Crystal chandeliers"
            checked={layout.chandeliers}
            onChange={(v) => onLayout({ chandeliers: v })}
          />
        </div>
      </Section>
      <Section title="Colour of the day">
        <div className="grid grid-cols-2 gap-1.5">
          {DECOR_PRESETS.map((p) => {
            const on =
              decor.linen === p.decor.linen && decor.sash === p.decor.sash;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onDecor({ ...p.decor, floor: decor.floor, wall: decor.wall })
                }
                className="group overflow-hidden rounded-xl border border-hairline bg-white text-left transition-all hover:-translate-y-px hover:shadow-sm aria-pressed:border-night aria-pressed:ring-1 aria-pressed:ring-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <span className="flex h-7" aria-hidden="true">
                  {[
                    p.decor.linen,
                    p.decor.sash ?? p.decor.linen,
                    p.decor.flower,
                    p.decor.drape ?? "#fff",
                  ].map((c, i) => (
                    <span
                      key={i}
                      className="flex-1"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="block px-2 py-1.5 text-[11px] font-semibold text-night">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Table cloths">
        <Swatches
          label="Table cloth"
          value={decor.linen}
          onPick={(v) => v && set({ linen: v })}
        />
      </Section>
      <Section title="Chairs">
        <Tiles<ChairType>
          label="Chair type"
          value={decor.chair}
          onPick={(v) => set({ chair: v })}
          options={CHAIR_TYPES.map((c) => ({
            key: c.key,
            label: c.label,
            icon: <ChairGlyph type={c.key} />,
          }))}
        />
        {decor.chair === "covered" && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold text-label-2">
              Chair cover
            </p>
            <Swatches
              label="Chair cover"
              value={decor.cover}
              onPick={(v) => v && set({ cover: v })}
            />
          </div>
        )}
        <p className="mb-1.5 mt-3 text-[11px] font-semibold text-label-2">
          Sash
        </p>
        <Swatches
          label="Chair sash"
          value={decor.sash}
          allowNone
          onPick={(v) => set({ sash: v })}
        />
      </Section>
      <Section title="Centrepieces">
        <Tiles<Centrepiece>
          label="Centrepiece"
          value={decor.centrepiece}
          onPick={(v) => set({ centrepiece: v })}
          options={CENTREPIECES.map((c) => ({
            ...c,
            icon: <CentrepieceGlyph kind={c.key} />,
          }))}
        />
        <p className="mb-1.5 mt-3 text-[11px] font-semibold text-label-2">
          Flowers
        </p>
        <Swatches
          label="Flowers"
          value={decor.flower}
          onPick={(v) => v && set({ flower: v })}
        />
      </Section>
      <Section title="Drapes & light">
        <p className="mb-1.5 text-[11px] font-semibold text-label-2">
          Wall drapes
        </p>
        <Swatches
          label="Wall drapes"
          value={decor.drape}
          allowNone
          onPick={(v) => set({ drape: v })}
        />
        <p className="mb-1.5 mt-3 text-[11px] font-semibold text-label-2">
          Uplighting
        </p>
        <Swatches
          label="Uplighting"
          value={decor.uplight}
          allowNone
          colours={LIGHT_PALETTE}
          onPick={(v) => set({ uplight: v })}
        />
      </Section>
      {styledCount > 0 && (
        <Section title="Tables styled on their own">
          <p className="text-xs text-label-2">
            {styledCount} {styledCount === 1 ? "table has" : "tables have"}{" "}
            their own styling and ignore the choices above.
          </p>
          <button
            type="button"
            onClick={onResetTables}
            className="mt-2 min-h-10 w-full rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night hover:border-night/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Make every table match the hall
          </button>
        </Section>
      )}
    </div>
  );
}
