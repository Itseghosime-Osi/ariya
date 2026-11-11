"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZONE_DEFAULTS } from "../model";
import type { AcUnit, Cooling, Mount, ThermalReport } from "@ariya/studio";
import { Section, Toggle } from "../studio-ui";

export const ZONE_LABEL = (k: keyof typeof ZONE_DEFAULTS) =>
  ZONE_DEFAULTS[k].label;

/** The heat-map scale, shared with the 3D overlay so the legend and the floor agree. */
export const HEAT_STOPS = [
  "#2c7bb6",
  "#abd9e9",
  "#ffffbf",
  "#fdae61",
  "#d7191c",
];

const MOUNTS: { key: Mount; label: string }[] = [
  { key: "wall", label: "Wall" },
  { key: "cassette", label: "Cassette" },
  { key: "floor", label: "Floor" },
];

/** The four sizes sold locally, in "HP". */
const UNIT_SIZES = [1, 1.5, 2, 2.5];

const temp = (v: number) => `${v.toFixed(1)} °C`;

/**
 * The thermal deck: the verdict, the cooling the host has planned, and the heat map read out as a
 * table. The map itself is drawn on the floor of the 3D hall; this is its non-visual equivalent.
 */
export function ThermalPanel({
  report,
  status,
  cooling,
  onCooling,
  placing,
  onTogglePlacing,
  onAddUnit,
  onDeleteUnit,
  onUpdateUnit,
  onFocusArea,
  heat,
  onToggleHeat,
}: {
  report: ThermalReport | null;
  status: "loading" | "ready" | "unavailable";
  cooling: Cooling | null;
  onCooling: (patch: Partial<Cooling>) => void;
  placing: boolean;
  onTogglePlacing: () => void;
  onAddUnit: () => void;
  onDeleteUnit: (id: string) => void;
  onUpdateUnit: (id: string, patch: Partial<AcUnit>) => void;
  onFocusArea: (id: string) => void;
  heat: boolean;
  onToggleHeat: () => void;
}) {
  const units = cooling?.units ?? [];
  const ach = cooling?.ach ?? 5;
  const targetC = cooling?.targetC ?? 24;
  const field = report?.field ?? null;
  const advice = report?.advice ?? null;
  const plant = report?.plant ?? null;
  const sizing = report?.sizing ?? null;

  if (status !== "ready") {
    return (
      <Section title="Cooling">
        <p className="text-[11px] leading-snug text-label-2">
          {status === "loading"
            ? "Working out the cooling…"
            : "The cooling model needs the layout engine, which did not load on this device. The rest of the studio still works."}
        </p>
      </Section>
    );
  }

  return (
    <div>
      {advice && (
        <Section title="The verdict">
          <div
            className={cn(
              "rounded-xl border p-3",
              advice.level === "viable"
                ? "border-[#1f6b4a]/30 bg-[#1f6b4a]/5"
                : "border-[#a3263b]/30 bg-[#a3263b]/5"
            )}
          >
            <p className="text-sm font-semibold leading-snug text-night">
              {advice.headline}
            </p>
            <ul className="mt-2 space-y-1.5">
              {advice.reasons.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-1.5 text-[11px] leading-snug text-label-2"
                >
                  <span aria-hidden="true" className="mt-1 shrink-0">
                    ·
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <Section title="How leaky is the room?">
        <label
          htmlFor="thermal-ach"
          className="flex items-center justify-between text-[11px] font-semibold text-label-2"
        >
          <span>Air changes an hour</span>
          <span className="tabular-nums text-night">{ach}</span>
        </label>
        <input
          id="thermal-ach"
          type="range"
          min={0}
          max={15}
          step={1}
          value={ach}
          onChange={(e) => onCooling({ ach: Number(e.target.value) })}
          className="mt-2 w-full accent-burgundy"
        />
        <div className="flex justify-between text-[10px] text-label-2">
          <span>Sealed</span>
          <span>Draughty</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-label-2">
          The biggest uncertainty in the whole model — a factor of three here
          swings the load by about 40 %. A closed hall is 3–5; a marquee 5–10.
        </p>
      </Section>

      <Section title="What counts as comfortable?">
        <label
          htmlFor="thermal-target"
          className="flex items-center justify-between text-[11px] font-semibold text-label-2"
        >
          <span>Target temperature</span>
          <span className="tabular-nums text-night">{targetC} °C</span>
        </label>
        <input
          id="thermal-target"
          type="range"
          min={18}
          max={30}
          step={1}
          value={targetC}
          onChange={(e) => onCooling({ targetC: Number(e.target.value) })}
          className="mt-2 w-full accent-burgundy"
        />
        <div className="flex justify-between text-[10px] text-label-2">
          <span>18 °C</span>
          <span>30 °C</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-label-2">
          Every degree below the outdoor air adds load. 24 °C is the usual
          target for a seated hall.
        </p>
      </Section>

      <Section
        title="Air conditioners"
        aside={
          <span className="text-[11px] tabular-nums text-label-2">
            {units.length}
            {sizing ? ` of ${sizing.count}` : ""}
          </span>
        }
      >
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onTogglePlacing}
            aria-pressed={placing}
            className={cn(
              "min-h-11 flex-1 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
              placing
                ? "bg-night text-white"
                : "border border-hairline bg-white text-night hover:border-night/40"
            )}
          >
            {placing ? "Click the floor · cancel" : "Place on the floor"}
          </button>
          <button
            type="button"
            onClick={onAddUnit}
            className="min-h-11 rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night transition-colors hover:border-night/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Add one
          </button>
        </div>
        {units.length === 0 ? (
          <p className="mt-2 text-[11px] leading-snug text-label-2">
            No units placed yet. The verdict above is for the set the room
            needs; place units to see where the cold actually lands.
          </p>
        ) : (
          <p className="mt-2 text-[11px] leading-snug text-label-2">
            Drag a unit on the floor to move it. Each one is drawn where it
            sits, so the map and the plan agree.
          </p>
        )}
        {units.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {units.map((u, i) => (
              <li
                key={u.id}
                className="rounded-xl border border-hairline bg-white p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-night">
                    Unit {i + 1} · {u.hp} HP
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteUnit(u.id)}
                    aria-label={`Remove unit ${i + 1}`}
                    className="grid h-11 w-11 place-items-center rounded-full text-label-2 hover:bg-[#f1ece4] hover:text-night focus-visible:outline-2 focus-visible:outline-burgundy"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-1.5 flex gap-1">
                  {MOUNTS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      aria-pressed={u.mount === m.key}
                      onClick={() => onUpdateUnit(u.id, { mount: m.key })}
                      className="min-h-11 flex-1 rounded-lg border border-hairline text-[11px] font-medium text-label-2 transition-colors aria-pressed:border-night aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-burgundy"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex gap-1">
                  {UNIT_SIZES.map((hp) => (
                    <button
                      key={hp}
                      type="button"
                      aria-pressed={u.hp === hp}
                      aria-label={`${hp} HP`}
                      onClick={() => onUpdateUnit(u.id, { hp })}
                      className="min-h-11 flex-1 rounded-lg border border-hairline text-[11px] font-medium tabular-nums text-label-2 transition-colors aria-pressed:border-night aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-burgundy"
                    >
                      {hp}
                    </button>
                  ))}
                </div>
                <div className="mt-1">
                  <Toggle
                    label="Inverter"
                    hint="Starts gently, so a roomful does not trip the generator"
                    checked={u.inverter}
                    onChange={(v) => onUpdateUnit(u.id, { inverter: v })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {field && (
        <Section title="Where it is warmest">
          <Toggle
            label="Show the heat map"
            hint="Paints the floor of the 3D hall; the table below says the same thing"
            checked={heat}
            onChange={onToggleHeat}
          />
          <div
            className="mt-2 h-3 w-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${HEAT_STOPS.join(", ")})`,
            }}
            aria-hidden="true"
          />
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-label-2">
            <span>{temp(field.minC)}</span>
            <span>{temp(field.maxC)}</span>
          </div>
          <table className="mt-2 w-full text-[11px]">
            <caption className="sr-only">
              Mean and peak temperature by area, warmest first
            </caption>
            <thead>
              <tr className="text-left text-label-2">
                <th scope="col" className="pb-1 font-semibold">
                  Area
                </th>
                <th scope="col" className="pb-1 text-right font-semibold">
                  Mean
                </th>
                <th scope="col" className="pb-1 text-right font-semibold">
                  Peak
                </th>
              </tr>
            </thead>
            <tbody>
              {field.areas.map((a) => (
                <tr key={a.id} className="border-t border-hairline">
                  <th scope="row" className="py-1 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => onFocusArea(a.id)}
                      className="text-left text-night underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-burgundy"
                    >
                      {a.label}
                    </button>
                  </th>
                  <td className="py-1 text-right tabular-nums">
                    {temp(a.meanC)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-label-2">
                    {temp(a.maxC)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-[11px] leading-snug text-label-2">
            The room averages {temp(field.meanC)}. The map is drawn on the floor
            of the hall.
          </p>
        </Section>
      )}

      {plant && (
        <Section title="What it asks of the plant">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-xl border border-hairline bg-white p-2">
              <span className="block text-[10px] uppercase tracking-wide text-label-2">
                Generator
              </span>
              <span className="font-display text-lg font-bold tabular-nums text-night">
                {plant.runningKw.toFixed(0)} kW
              </span>
              <span className="block text-[10px] text-label-2">
                {plant.surgeKw.toFixed(0)} kW starting
              </span>
            </div>
            <div className="rounded-xl border border-hairline bg-white p-2">
              <span className="block text-[10px] uppercase tracking-wide text-label-2">
                Condensate
              </span>
              <span className="font-display text-lg font-bold tabular-nums text-night">
                {plant.condensateLph.toFixed(0)} L/h
              </span>
              <span className="block text-[10px] text-label-2">
                a drain, not a tray
              </span>
            </div>
          </div>
        </Section>
      )}

      {report && (
        <Section title="How we got this">
          <details className="text-[11px] leading-snug text-label-2">
            <summary className="cursor-pointer font-semibold text-night">
              The inputs, the rule and the source
            </summary>
            <dl className="mt-2 space-y-1.5">
              <div>
                <dt className="font-semibold text-night">Inputs</dt>
                <dd>
                  {report.loads.totalKw.toFixed(0)} kW of load:{" "}
                  {report.loads.sensibleKw.toFixed(0)} kW sensible,{" "}
                  {report.loads.latentKw.toFixed(0)} kW latent. Sensible heat
                  ratio {report.loads.shr.toFixed(2)}.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-night">The rule</dt>
                <dd>
                  A split removes its sticker capacity less the sun and a fouled
                  coil, and its coil fixes how much moisture it can take out.
                  The room is the balance of what it gains against what the set
                  removes.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-night">The source</dt>
                <dd>
                  Research §C.4–C.8: the sensible and latent balances, the split
                  catalogue, and the plant figures. A screening tool, not a
                  design — a real HVAC engineer will refine it.
                </dd>
              </div>
            </dl>
          </details>
        </Section>
      )}
    </div>
  );
}
