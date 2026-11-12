"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Section } from "@/features/seating/hall/studio-ui";
import { draftInvitationDesign } from "../../assistant";
import { applyInvitationTheme, THEME_PALETTES } from "../../design";
import {
  CANVAS_PRESETS,
  designRatio,
  hasImportedCard,
  resizeCanvasPx,
} from "../../layer-ops";
import {
  INVITATION_THEME_LABELS,
  INVITATION_THEMES,
  type InvitationDesign,
  type InvitationEventContent,
  type InvitationLayer,
} from "../../types";

const FIELD =
  "desk-field min-h-12 w-full rounded-[10px] px-4 py-3 text-base text-night focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-burgundy";

/** What a person calls each line, in their words, not the designer's. */
const WORDS: {
  kind: InvitationLayer["kind"];
  label: string;
  long?: boolean;
}[] = [
  { kind: "names", label: "Names" },
  { kind: "kicker", label: "Line above the names" },
  { kind: "message", label: "Your message", long: true },
  { kind: "date", label: "Date" },
  { kind: "venue", label: "Place" },
  { kind: "dressCode", label: "Dress code" },
  { kind: "footer", label: "Reply line" },
];

const SHAPES = CANVAS_PRESETS.slice(0, 4);

function BigButton({
  icon,
  children,
  onClick,
  busy,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-hairline bg-white/60 px-5 text-sm font-semibold text-night hover:bg-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
    >
      <Icon name={icon} size={17} />
      {children}
    </button>
  );
}

/**
 * Simple mode: questions in plain words, no layers, no numbers. It edits the same document the
 * Pro tools do, so nothing is lost by switching between them.
 */
export function SimplePanel({
  design,
  content,
  busy,
  onPatch,
  onDesign,
  onReplaceDesign,
  onImportCard,
  onRemoveCard,
  onAddPhoto,
  onAddText,
  onDeleteLayer,
  passRequired,
  settingsHref,
}: {
  design: InvitationDesign;
  content: InvitationEventContent;
  busy: boolean;
  onPatch: (id: string, patch: Partial<InvitationLayer>) => void;
  onDesign: (next: (d: InvitationDesign) => InvitationDesign) => void;
  onReplaceDesign: (d: InvitationDesign) => void;
  onImportCard: () => void;
  onRemoveCard: () => void;
  onAddPhoto: () => void;
  onAddText: () => void;
  onDeleteLayer: (id: string) => void;
  /** The access pass is on, so each accepted guest's card carries an entry seal. */
  passRequired: boolean;
  settingsHref: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const carded = hasImportedCard(design);
  const ratio = designRatio(design);
  const extras = design.layers.filter((l) => l.kind === "text");

  return (
    <div data-testid="simple-panel">
      <Section title="Your own card">
        {carded ? (
          <div className="space-y-3">
            <p className="text-sm text-label-2">
              Your card is the background. Turn on any of the words below to put
              them on top of it.
            </p>
            <div className="flex flex-wrap gap-2">
              <BigButton icon="upload" onClick={onImportCard} busy={busy}>
                Use a different card
              </BigButton>
              <BigButton icon="undo" onClick={onRemoveCard}>
                Use our design instead
              </BigButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-label-2">
              Already made a card in Canva, Photoshop or anywhere else? Bring it
              in as a picture (PNG, JPG or WebP, up to 5 MB).
            </p>
            <BigButton icon="upload" onClick={onImportCard} busy={busy}>
              {busy ? "Importing…" : "Import my card"}
            </BigButton>
          </div>
        )}
      </Section>

      <Section title="Words">
        <div className="space-y-4">
          {WORDS.map(({ kind, label, long }) => {
            const layer = design.layers.find((l) => l.kind === kind);
            if (!layer) return null;
            const id = `simple-${layer.id}`;
            return (
              <div key={layer.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label
                    htmlFor={id}
                    className="text-sm font-semibold text-night"
                  >
                    {label}
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-label-2">
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={(e) =>
                        onPatch(layer.id, { visible: e.target.checked })
                      }
                      className="h-5 w-5 accent-[var(--burgundy)]"
                    />
                    Show
                  </label>
                </div>
                {long ? (
                  <textarea
                    id={id}
                    rows={3}
                    value={layer.text}
                    onChange={(e) =>
                      onPatch(layer.id, {
                        text: e.target.value.slice(0, 600),
                        ...(e.target.value.trim() ? { visible: true } : {}),
                      })
                    }
                    className={FIELD}
                  />
                ) : (
                  <input
                    id={id}
                    type="text"
                    value={layer.text}
                    onChange={(e) =>
                      onPatch(layer.id, {
                        text: e.target.value.slice(0, 600),
                        ...(e.target.value.trim() ? { visible: true } : {}),
                      })
                    }
                    className={FIELD}
                  />
                )}
              </div>
            );
          })}
          {extras.map((layer) => (
            <div key={layer.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor={`simple-${layer.id}`}
                  className="text-sm font-semibold text-night"
                >
                  Extra words
                </label>
                <button
                  type="button"
                  onClick={() => onDeleteLayer(layer.id)}
                  className="inline-flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-label-2 hover:text-night"
                >
                  <Icon name="delete" size={14} />
                  Remove
                </button>
              </div>
              <textarea
                id={`simple-${layer.id}`}
                rows={2}
                value={layer.text}
                onChange={(e) =>
                  onPatch(layer.id, { text: e.target.value.slice(0, 600) })
                }
                className={FIELD}
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <BigButton icon="text_fields" onClick={onAddText}>
              Add more words
            </BigButton>
            <BigButton icon="image" onClick={onAddPhoto} busy={busy}>
              Add a photo
            </BigButton>
          </div>
        </div>
      </Section>

      <Section title="Look">
        <div className="grid grid-cols-2 gap-2">
          {INVITATION_THEMES.map((t) => {
            const p = THEME_PALETTES[t];
            return (
              <button
                key={t}
                type="button"
                aria-pressed={design.theme === t}
                onClick={() => onDesign((d) => applyInvitationTheme(d, t))}
                className="rounded-[10px] border border-hairline bg-white/60 p-3 text-left hover:bg-white aria-pressed:border-burgundy aria-pressed:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
              >
                <span className="mb-2 flex gap-1">
                  {[p.paper, p.title, p.accent, p.foil].map((c) => (
                    <span
                      key={c}
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="text-sm font-semibold text-night">
                  {INVITATION_THEME_LABELS[t]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mb-2 mt-4 text-sm font-semibold text-night">Card shape</p>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Card shape"
        >
          {SHAPES.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={Math.abs(s.ratio - ratio) < 0.01}
              onClick={() =>
                onDesign((d) => resizeCanvasPx(d, s.widthPx, s.heightPx))
              }
              className="min-h-11 rounded-full border border-hairline bg-white/60 px-4 text-sm font-semibold text-night aria-pressed:border-burgundy aria-pressed:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Entry pass">
        {passRequired ? (
          <p className="text-sm leading-relaxed text-label-2">
            The access pass is on. Every guest who accepts gets their card with
            their own entry seal already on it, so there is nothing to add. The
            door scanner reads it. To choose where it sits, switch to Pro.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-label-2">
            The access pass is off, so cards go out without an entry seal. To
            give guests a pass for the door,{" "}
            <a
              href={settingsHref}
              className="font-semibold text-burgundy underline underline-offset-2"
            >
              turn it on in RSVP &amp; card
            </a>
            .
          </p>
        )}
      </Section>

      <Section title="Describe it">
        <p className="mb-2 text-sm text-label-2">
          Say the feel you want and we will set the colours and layout. This
          replaces your current layout; Undo brings it back.
        </p>
        <label htmlFor="simple-prompt" className="sr-only">
          Describe the invitation you want
        </label>
        <textarea
          id="simple-prompt"
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Emerald garden wedding, soft and classic"
          className={FIELD}
        />
        <div className="mt-2 flex items-center gap-3">
          <BigButton
            icon="magic"
            onClick={() => {
              if (!prompt.trim()) return;
              const draft = draftInvitationDesign(prompt, content);
              onReplaceDesign(draft.design);
              setSummary(draft.summary);
            }}
          >
            Draft it
          </BigButton>
          {summary && <p className="text-[13px] text-label-2">{summary}</p>}
        </div>
      </Section>

      <p className="px-4 py-4 text-[13px] text-label-2">
        Want to place things anywhere, draw shapes or turn things? Switch to Pro
        at the top. Everything you did here stays.
      </p>
    </div>
  );
}
