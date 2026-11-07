"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
  Section,
  Segmented,
  Swatches,
  Toggle,
} from "@/features/seating/hall/studio-ui";
import { applyInvitationTheme } from "../../design";
import {
  CANVAS_PRESETS,
  designRatio,
  type Alignment,
  type StackMove,
} from "../../layer-ops";
import {
  INVITATION_LAYER_LABELS,
  INVITATION_THEME_LABELS,
  INVITATION_THEMES,
  type InvitationColorRole,
  type InvitationDesign,
  type InvitationLayer,
} from "../../types";
import { THEME_PALETTES } from "../../design";

type Patch = Partial<InvitationLayer>;

const FIELD =
  "desk-field min-h-11 w-full rounded-xl px-3 text-sm text-night outline-hidden focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy";

/** A number that commits on Enter or when you leave it, so typing "12" never passes through "1". */
function Num({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const shown = String(Math.round(value * 100) / 100);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => {
    const n = Number(text.replace(",", "."));
    if (!Number.isFinite(n)) return setText(shown);
    const next = Math.min(max, Math.max(min, n));
    setText(String(next));
    if (next !== value) onChange(next);
  };
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-label-2">
        {label}
      </span>
      <span className="relative block">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          aria-label={label}
          data-step={step}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") commit();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const n = Number(text) + (e.key === "ArrowUp" ? step : -step);
              const next = Math.min(max, Math.max(min, n));
              setText(String(Math.round(next * 100) / 100));
              onChange(next);
            }
          }}
          className={FIELD + (suffix ? " pr-8" : "")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-label-2">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-xl border border-hairline bg-white/60 text-night hover:bg-white disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
    >
      {children}
    </button>
  );
}

const ALIGN: { key: Alignment; label: string; d: string }[] = [
  { key: "left", label: "Align left", d: "M3 3v18M7 7h12M7 13h7" },
  { key: "centre", label: "Centre across", d: "M12 3v18M5 7h14M8 13h8" },
  { key: "right", label: "Align right", d: "M21 3v18M5 7h12M10 13h7" },
  { key: "top", label: "Align top", d: "M3 3h18M7 7v12M13 7v7" },
  { key: "middle", label: "Centre down", d: "M3 12h18M7 5v14M13 8v8" },
  { key: "bottom", label: "Align bottom", d: "M3 21h18M7 5v12M13 10v7" },
];

const ROLES: { value: InvitationColorRole; label: string }[] = [
  { value: "title", label: "Names" },
  { value: "ink", label: "Ink" },
  { value: "body", label: "Body" },
  { value: "accent", label: "Eyebrow" },
  { value: "foil", label: "Foil" },
];

const TEXT_KINDS: InvitationLayer["kind"][] = [
  "kicker",
  "names",
  "message",
  "date",
  "venue",
  "dressCode",
  "footer",
  "text",
];

export function Inspector({
  design,
  layer,
  onPatch,
  onDesign,
  onAlign,
  onStack,
  onDuplicate,
  onDelete,
  canDelete,
  onPickImage,
  onUploadBackground,
  onExport,
  onImportFile,
}: {
  design: InvitationDesign;
  layer: InvitationLayer | null;
  onPatch: (id: string, patch: Patch) => void;
  onDesign: (next: (d: InvitationDesign) => InvitationDesign) => void;
  onAlign: (id: string, how: Alignment) => void;
  onStack: (id: string, move: StackMove) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete: (layer: InvitationLayer) => boolean;
  /** Opens the file picker to choose (or replace) the picture for a layer. */
  onPickImage: (forLayerId: string) => void;
  onUploadBackground: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
}) {
  if (!layer) {
    const ratio = designRatio(design);
    const bg = design.background;
    return (
      <div data-testid="inspector-card">
        <Section title="Card shape">
          <div className="grid grid-cols-2 gap-2">
            {CANVAS_PRESETS.map((p) => {
              const on = Math.abs(p.ratio - ratio) < 0.01;
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onDesign((d) => ({ ...d, canvas: { ratio: p.ratio } }))
                  }
                  className="rounded-xl border border-hairline bg-white/60 px-3 py-2.5 text-left transition-colors hover:bg-white aria-pressed:border-burgundy aria-pressed:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
                >
                  <span className="block text-sm font-semibold text-night">
                    {p.label}
                  </span>
                  <span className="block text-[11px] text-label-2">
                    {p.note}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Background">
          <Segmented
            label="Background"
            value={bg.kind}
            options={[
              { key: "paper", label: "Paper" },
              { key: "velvet", label: "Velvet" },
              { key: "color", label: "Colour" },
              { key: "image", label: "Picture" },
            ]}
            onPick={(kind) =>
              onDesign((d) => ({
                ...d,
                background: {
                  ...d.background,
                  kind,
                  color: d.background.color ?? "#fffaf0",
                },
              }))
            }
          />
          {bg.kind === "color" && (
            <div className="mt-3">
              <Swatches
                label="Background colour"
                value={bg.color ?? "#fffaf0"}
                onPick={(c) =>
                  onDesign((d) => ({
                    ...d,
                    background: { ...d.background, color: c },
                  }))
                }
              />
            </div>
          )}
          {bg.kind === "image" && (
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={onUploadBackground}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-white/60 px-4 text-sm font-semibold text-night hover:bg-white"
              >
                <Icon name="upload" size={16} />
                {bg.imageUrl ? "Replace picture" : "Choose a picture"}
              </button>
              <Num
                label="Paper tint over it"
                value={Math.round(bg.overlay * 100)}
                min={0}
                max={90}
                suffix="%"
                onChange={(v) =>
                  onDesign((d) => ({
                    ...d,
                    background: { ...d.background, overlay: v / 100 },
                  }))
                }
              />
            </div>
          )}
        </Section>

        <Section title="Colours">
          <div className="grid grid-cols-2 gap-2">
            {INVITATION_THEMES.map((t) => {
              const p = THEME_PALETTES[t];
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={design.theme === t}
                  onClick={() => onDesign((d) => applyInvitationTheme(d, t))}
                  className="rounded-xl border border-hairline bg-white/60 p-2.5 text-left hover:bg-white aria-pressed:border-burgundy aria-pressed:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
                >
                  <span className="mb-1.5 flex gap-1">
                    {[p.paper, p.title, p.accent, p.foil].map((c) => (
                      <span
                        key={c}
                        className="h-5 w-5 rounded-full border border-black/10"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                  <span className="text-[13px] font-semibold text-night">
                    {INVITATION_THEME_LABELS[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Decoration">
          <Toggle
            label="House ribbon and border"
            hint="Turn off to draw your card from scratch."
            checked={design.chrome !== false}
            onChange={(on) => onDesign((d) => ({ ...d, chrome: on }))}
          />
        </Section>

        <Section title="Design file">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExport}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-white/60 px-4 text-sm font-semibold text-night hover:bg-white"
            >
              <Icon name="download" size={16} />
              Save a copy
            </button>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-hairline bg-white/60 px-4 text-sm font-semibold text-night focus-within:outline-2 focus-within:outline-burgundy hover:bg-white">
              <Icon name="upload" size={16} />
              Open a copy
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </Section>
      </div>
    );
  }

  const patch = (p: Patch) => onPatch(layer.id, p);
  const isText = TEXT_KINDS.includes(layer.kind);
  const hasBox = layer.kind === "shape" || layer.kind === "image";
  const label =
    layer.kind === "shape"
      ? layer.shape === "ellipse"
        ? "Circle"
        : layer.shape === "line"
          ? "Line"
          : "Rectangle"
      : INVITATION_LAYER_LABELS[layer.kind];

  return (
    <div data-testid="inspector-layer">
      <Section
        title={label}
        aside={
          <span className="truncate text-xs text-label-2">{layer.name}</span>
        }
      >
        {layer.locked && (
          <p className="mb-3 rounded-xl bg-gold/15 px-3 py-2 text-[12px] text-gold-ink">
            This layer is locked. Unlock it in the layers list to move or resize
            it.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Num
            label="Left"
            suffix="%"
            value={layer.x}
            min={0}
            max={100}
            step={0.5}
            onChange={(v) => patch({ x: v })}
          />
          <Num
            label="Top"
            suffix="%"
            value={layer.y}
            min={0}
            max={100}
            step={0.5}
            onChange={(v) => patch({ y: v })}
          />
          <Num
            label="Width"
            suffix="%"
            value={layer.width}
            min={5}
            max={100}
            step={0.5}
            onChange={(v) => patch({ width: v })}
          />
          {hasBox && layer.shape !== "line" ? (
            <Num
              label="Height"
              suffix="%"
              value={layer.height ?? 20}
              min={0.2}
              max={100}
              step={0.5}
              onChange={(v) => patch({ height: v })}
            />
          ) : (
            <span />
          )}
          <Num
            label="Turn"
            suffix="°"
            value={layer.rotation ?? 0}
            min={-180}
            max={180}
            step={1}
            onChange={(v) => patch({ rotation: v })}
          />
          <Num
            label="See-through"
            suffix="%"
            value={Math.round((1 - (layer.opacity ?? 1)) * 100)}
            min={0}
            max={100}
            step={5}
            onChange={(v) => patch({ opacity: 1 - v / 100 })}
          />
        </div>
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Align on the card"
        >
          {ALIGN.map((a) => (
            <IconBtn
              key={a.key}
              label={a.label}
              onClick={() => onAlign(layer.id, a.key)}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d={a.d} />
              </svg>
            </IconBtn>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <IconBtn
            label="Bring to front"
            onClick={() => onStack(layer.id, "front")}
          >
            <Icon name="expand_less" size={18} />
          </IconBtn>
          <IconBtn
            label="Send to back"
            onClick={() => onStack(layer.id, "back")}
          >
            <Icon name="expand_more" size={18} />
          </IconBtn>
          <IconBtn
            label="Duplicate"
            disabled={layer.kind === "code"}
            onClick={() => onDuplicate(layer.id)}
          >
            <Icon name="copy" size={17} />
          </IconBtn>
          <IconBtn
            label="Delete"
            disabled={!canDelete(layer)}
            onClick={() => onDelete(layer.id)}
          >
            <Icon name="delete" size={17} />
          </IconBtn>
        </div>
      </Section>

      {isText && (
        <Section title="Words">
          <label className="block">
            <span className="sr-only">Text</span>
            <textarea
              id="designer-text-input"
              rows={3}
              value={layer.text}
              onChange={(e) => patch({ text: e.target.value.slice(0, 600) })}
              className={FIELD + " py-2.5"}
            />
          </label>
          <div className="mt-3 space-y-3">
            <Segmented
              label="Typeface"
              value={layer.font}
              options={[
                { key: "display", label: "Serif" },
                { key: "sans", label: "Clean" },
              ]}
              onPick={(font) => patch({ font })}
            />
            <Segmented
              label="Alignment"
              value={layer.align}
              options={[
                { key: "left", label: "Left" },
                { key: "center", label: "Centre" },
                { key: "right", label: "Right" },
              ]}
              onPick={(align) => patch({ align })}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Num
                label="Size"
                value={layer.size}
                min={1}
                max={20}
                step={0.2}
                onChange={(v) => patch({ size: v })}
              />
              <Num
                label="Letter gap"
                value={layer.tracking}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) => patch({ tracking: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-label-2">
                  Weight
                </span>
                <select
                  value={layer.weight}
                  onChange={(e) =>
                    patch({
                      weight: Number(
                        e.target.value
                      ) as InvitationLayer["weight"],
                    })
                  }
                  className={FIELD}
                >
                  <option value={400}>Regular</option>
                  <option value={500}>Medium</option>
                  <option value={600}>Semibold</option>
                  <option value={700}>Bold</option>
                </select>
              </label>
              <div>
                <span className="mb-1 block text-[11px] font-semibold text-label-2">
                  Style
                </span>
                <button
                  type="button"
                  aria-pressed={layer.italic}
                  onClick={() => patch({ italic: !layer.italic })}
                  className="min-h-11 w-full rounded-xl border border-hairline bg-white/60 text-sm italic text-night aria-pressed:border-burgundy aria-pressed:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
                >
                  Italic
                </button>
              </div>
            </div>
          </div>
        </Section>
      )}

      {(isText || layer.kind === "divider" || layer.kind === "seal") && (
        <Section title="Colour">
          {layer.kind !== "seal" && (
            <div
              className="mb-3 flex flex-wrap gap-1.5"
              role="group"
              aria-label="Colour from the card's palette"
            >
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={layer.colorRole === r.value}
                  onClick={() => patch({ colorRole: r.value, color: null })}
                  className="min-h-9 rounded-full border border-hairline bg-white/60 px-3 text-xs font-semibold text-night aria-pressed:border-burgundy aria-pressed:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <Swatches
            label="Text colour"
            value={layer.colorRole === "custom" ? layer.color : null}
            onPick={(c) => c && patch({ colorRole: "custom", color: c })}
          />
        </Section>
      )}

      {layer.kind === "shape" && (
        <Section title="Shape">
          <div className="space-y-3">
            {layer.shape !== "line" && (
              <>
                <p className="text-[11px] font-semibold text-label-2">Fill</p>
                <Swatches
                  label="Fill"
                  allowNone
                  value={layer.fill ?? null}
                  onPick={(c) => patch({ fill: c })}
                />
              </>
            )}
            <p className="text-[11px] font-semibold text-label-2">
              {layer.shape === "line" ? "Colour" : "Outline"}
            </p>
            <Swatches
              label="Outline"
              allowNone={layer.shape !== "line"}
              value={layer.stroke ?? null}
              onPick={(c) => patch({ stroke: c })}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Num
                label={layer.shape === "line" ? "Thickness" : "Outline width"}
                value={layer.strokeWidth ?? 0.4}
                min={0}
                max={10}
                step={0.1}
                onChange={(v) =>
                  patch({
                    strokeWidth: v,
                    ...(layer.shape === "line"
                      ? { height: Math.max(0.2, v) }
                      : {}),
                  })
                }
              />
              {layer.shape === "rect" && (
                <Num
                  label="Corners"
                  value={layer.radius ?? 0}
                  min={0}
                  max={50}
                  step={0.5}
                  onChange={(v) => patch({ radius: v })}
                />
              )}
            </div>
          </div>
        </Section>
      )}

      {layer.kind === "image" && (
        <Section title="Picture">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onPickImage(layer.id)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-white/60 px-4 text-sm font-semibold text-night hover:bg-white"
            >
              <Icon name="upload" size={16} />
              Replace picture
            </button>
            <Segmented
              label="Fit"
              value={layer.fit ?? "cover"}
              options={[
                { key: "cover", label: "Fill the box" },
                { key: "contain", label: "Show all" },
              ]}
              onPick={(fit) => patch({ fit })}
            />
            <Num
              label="Round the corners"
              value={layer.radius ?? 0}
              min={0}
              max={50}
              step={0.5}
              onChange={(v) => patch({ radius: v })}
            />
          </div>
        </Section>
      )}

      {layer.kind === "code" && (
        <Section title="Entry seal">
          <p className="text-[13px] leading-relaxed text-label-2">
            Each guest&apos;s own entry code is woven into this seal. Guests
            only see a decorative seal; the door scanner reads it. It appears
            only for guests who have accepted.
          </p>
        </Section>
      )}
    </div>
  );
}
