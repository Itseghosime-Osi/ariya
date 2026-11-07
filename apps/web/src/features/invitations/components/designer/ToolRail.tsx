"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";

export type AddKind = "text" | "rect" | "ellipse" | "line" | "seal" | "code";

const svg = {
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Tool({
  label,
  shortcut,
  onClick,
  disabled,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-keyshortcuts={shortcut}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-night transition-colors hover:bg-burgundy/10 disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
    >
      {children}
    </button>
  );
}

const Divider = () => (
  <span
    aria-hidden="true"
    className="mx-1 h-px w-6 shrink-0 bg-hairline max-lg:h-6 max-lg:w-px lg:my-1"
  />
);

/** The tools: each one adds something to the card and selects it, ready to place. */
export function ToolRail({
  onAdd,
  onPickImage,
  onImportCard,
  hasEntrySeal,
  busy,
}: {
  onAdd: (kind: AddKind) => void;
  onPickImage: () => void;
  onImportCard: () => void;
  hasEntrySeal: boolean;
  busy: boolean;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Design tools"
      aria-orientation="vertical"
      className="flex items-center gap-0.5 overflow-x-auto rounded-full border border-black/[0.06] bg-white/95 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_30px_-12px_rgba(28,7,13,0.35)] backdrop-blur max-lg:max-w-full lg:flex-col lg:overflow-visible"
    >
      <Tool label="Add text" shortcut="T" onClick={() => onAdd("text")}>
        <Icon name="text_fields" size={20} />
      </Tool>
      <Tool label="Add rectangle" shortcut="R" onClick={() => onAdd("rect")}>
        <svg {...svg}>
          <rect x="4" y="6" width="16" height="12" rx="2" />
        </svg>
      </Tool>
      <Tool label="Add circle" shortcut="O" onClick={() => onAdd("ellipse")}>
        <svg {...svg}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      </Tool>
      <Tool label="Add line" shortcut="L" onClick={() => onAdd("line")}>
        <svg {...svg}>
          <path d="M4 18 20 6" />
        </svg>
      </Tool>
      <Divider />
      <Tool
        label="Add a picture"
        shortcut="I"
        onClick={onPickImage}
        disabled={busy}
      >
        <Icon name="image" size={20} />
      </Tool>
      <Tool label="Import your own card" onClick={onImportCard} disabled={busy}>
        <Icon name="upload" size={20} />
      </Tool>
      <Divider />
      <Tool label="Add wax seal" onClick={() => onAdd("seal")}>
        <Icon name="celebration" size={20} />
      </Tool>
      <Tool
        label={hasEntrySeal ? "Entry seal is on the card" : "Add entry seal"}
        onClick={() => onAdd("code")}
        disabled={hasEntrySeal}
      >
        <Icon name="qr_code_scanner" size={20} />
      </Tool>
    </div>
  );
}
