"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { dialogTheme } from "./dialog-theme";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  dark?: boolean;
}

const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: "Editing",
    items: [
      ["Undo", "⌘/Ctrl Z"],
      ["Redo", "⌘/Ctrl Shift Z"],
      ["Duplicate", "⌘/Ctrl J"],
      ["Delete layer", "Delete"],
      ["Group / Ungroup", "⌘/Ctrl G · ⌘/Ctrl Shift G"],
      ["Select all", "⌘/Ctrl A"],
      ["Bring forward / send back", "⌘/Ctrl ] · ⌘/Ctrl ["],
    ],
  },
  {
    group: "Tools",
    items: [
      ["Text", "T"],
      ["Rectangle", "R"],
      ["Ellipse", "O"],
      ["Line", "L"],
      ["Arrow", "A"],
      ["Star", "S"],
      ["Monogram seal", "B"],
      ["Guest pass seal", "Q"],
    ],
  },
  {
    group: "View and files",
    items: [
      ["Zoom in / out", "⌘/Ctrl + · ⌘/Ctrl -"],
      ["Fit to screen", "⌘/Ctrl 0"],
      ["Actual size", "⌘/Ctrl 1"],
      ["Export invitation", "⌘/Ctrl E"],
      ["Upload image", "⌘/Ctrl U"],
      ["Find a command", "⌘/Ctrl K"],
      ["This help", "?"],
    ],
  },
];

const TIPS = [
  "Start from a template, then change the names, date and venue. Simple mode shows only what you need.",
  "Your work saves by itself. The status under the title says saved, saving or not saved.",
  "Use Export to get a PDF for printing, a PNG or JPEG for sharing, or a backup you can open again.",
  "Guests get their own entry pass after they accept. The seal on the card is only a sample.",
];

export function HelpDialog({ open, onClose, dark = false }: HelpDialogProps) {
  const t = dialogTheme(dark);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby="studio-help-desc"
          data-testid="studio-help"
          className={cn(
            "fixed inset-0 z-(--studio-z-overlay) flex items-center justify-center p-4 backdrop-blur-md",
            t.overlay
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className={cn(
              "relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border p-6 shadow-2xl",
              t.panel
            )}
          >
            <div
              className={cn(
                "flex items-start justify-between border-b pb-4",
                t.divider
              )}
            >
              <div>
                <Dialog.Title
                  className={cn(
                    "font-serif text-2xl font-bold tracking-tight",
                    t.title
                  )}
                >
                  Help and shortcuts
                </Dialog.Title>
                <p
                  id="studio-help-desc"
                  className={cn("mt-1 text-xs", t.muted)}
                >
                  Quick tips for the invitation studio.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close help"
                onClick={onClose}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full transition",
                  t.ghost
                )}
              >
                <span className="text-xl leading-none">✕</span>
              </button>
            </div>

            <h3 className={cn("mt-4 text-sm font-semibold", t.strong)}>
              Getting started
            </h3>
            <ul
              className={cn(
                "mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed",
                t.muted
              )}
            >
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>

            {SHORTCUTS.map((section) => (
              <section key={section.group} className="mt-5">
                <h3 className={cn("text-sm font-semibold", t.strong)}>
                  {section.group}
                </h3>
                <dl className={cn("mt-2 divide-y text-xs", t.rows)}>
                  {section.items.map(([label, keys]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 py-1.5"
                    >
                      <dt className={t.muted}>{label}</dt>
                      <dd className={cn("font-mono", t.strong)}>{keys}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            <p
              className={cn(
                "mt-5 rounded-xl border p-3 text-xs leading-relaxed",
                t.well,
                t.muted
              )}
            >
              Stuck? Email{" "}
              <a
                href="mailto:help@ariyaday.com"
                className="font-semibold underline"
              >
                help@ariyaday.com
              </a>{" "}
              and tell us what you were doing.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
