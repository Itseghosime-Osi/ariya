"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";

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
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md ${dark ? "dark" : ""}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-black/10 bg-ivory p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1118] dark:text-ivory">
            <div className="flex items-start justify-between border-b border-black/10 pb-4 dark:border-white/10">
              <div>
                <Dialog.Title className="font-serif text-2xl font-bold tracking-tight text-night dark:text-ivory">
                  Help and shortcuts
                </Dialog.Title>
                <p id="studio-help-desc" className="mt-1 text-xs text-label-2">
                  Quick tips for the invitation studio.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close help"
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-full text-label-2 transition hover:bg-black/5 hover:text-night dark:hover:bg-white/10 dark:hover:text-ivory"
              >
                <span className="text-xl leading-none">✕</span>
              </button>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-night dark:text-ivory">
              Getting started
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-label-2">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>

            {SHORTCUTS.map((section) => (
              <section key={section.group} className="mt-5">
                <h3 className="text-sm font-semibold text-night dark:text-ivory">
                  {section.group}
                </h3>
                <dl className="mt-2 divide-y divide-black/5 text-xs dark:divide-white/10">
                  {section.items.map(([label, keys]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 py-1.5"
                    >
                      <dt className="text-label-2">{label}</dt>
                      <dd className="font-mono text-night dark:text-ivory">
                        {keys}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            <p className="mt-5 rounded-xl border border-hairline bg-burgundy/5 p-3 text-xs leading-relaxed text-label-2">
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
