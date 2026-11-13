"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Copy,
  Download,
  Link2,
  Printer,
  Share2,
} from "lucide-react";
import { createHallShareAction, revokeHallShareAction } from "../actions";
import { buildFloorPlanPdf, type PlanTable } from "./floorplan-pdf";
import type { HallLayout } from "./model";
import { sharePath } from "./share";

/**
 * Share the floor plan with the venue or caterer: a view-only link (room and tables, never guest
 * names) that can be stopped at any time, and a measured PDF to print or email.
 */
export function ShareMenu({
  eventId,
  eventTitle,
  layout,
  tables,
  initialToken,
  currentRev,
  adoptRev,
  whenIdle,
  onSnapshot,
  printHref,
  className,
  onSay,
}: {
  eventId: string;
  eventTitle?: string;
  layout: HallLayout;
  tables: PlanTable[];
  initialToken: string | null;
  currentRev: () => number;
  adoptRev: (n: number) => void;
  /** Resolves once the studio has no save waiting or in flight. */
  whenIdle: () => Promise<void>;
  /** Save a picture of the hall as it is drawn now. */
  onSnapshot?: () => void;
  /** The printable seating chart and place cards. */
  printHref?: string;
  className?: string;
  onSay: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState<null | "link" | "pdf">(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !box.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}${sharePath(token)}`
      : "";

  const change = async (make: boolean) => {
    setBusy("link");
    setError(null);
    // Finish the studio's own save first, or the two would race on the hall's revision.
    await whenIdle();
    const res = make
      ? await createHallShareAction(eventId, currentRev(), layout)
      : await revokeHallShareAction(eventId, currentRev());
    setBusy(null);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Could not change the link.");
      return;
    }
    adoptRev(res.data.rev);
    setToken(make ? res.data.token : null);
    setCopied(false);
    onSay(
      make
        ? "View-only link ready"
        : "Sharing stopped. The old link no longer works."
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onSay("Link copied");
    } catch {
      setError("Could not copy. Select the link and copy it instead.");
    }
  };

  const pdf = async () => {
    setBusy("pdf");
    try {
      const bytes = await buildFloorPlanPdf({
        title: eventTitle ?? "Floor plan",
        layout,
        tables,
      });
      const href = URL.createObjectURL(
        new Blob([bytes as BlobPart], { type: "application/pdf" })
      );
      const a = document.createElement("a");
      a.href = href;
      a.download = "floor-plan.pdf";
      a.click();
      URL.revokeObjectURL(href);
      onSay("Floor plan downloaded");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className={className}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Share the floor plan"
        title="Share the floor plan"
      >
        <Share2 size={17} aria-hidden="true" />
      </button>
      {open && (
        <div
          data-testid="hall-share"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-80 rounded-2xl border border-hairline bg-white p-3 text-night shadow-xl"
        >
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
            Share with the venue or caterer
          </h2>
          <p className="mt-1 text-xs text-label-2">
            The link shows the room and tables to scale. Never guest names.
          </p>

          {token ? (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] font-semibold text-label-2">
                View-only link
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="mt-1 h-11 w-full rounded-lg border border-hairline bg-ivory px-2 text-xs text-night"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-night px-3 text-xs font-semibold text-white hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                >
                  {copied ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <Copy size={14} aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void change(false)}
                  className="min-h-11 rounded-full border border-hairline px-3 text-xs font-semibold text-[#9e2a2b] hover:bg-[#fbeeee] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-burgundy"
                >
                  Stop sharing
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void change(true)}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-night px-3 text-xs font-semibold text-white hover:bg-burgundy disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <Link2 size={14} aria-hidden="true" />
              {busy === "link" ? "Making the link…" : "Create a view-only link"}
            </button>
          )}

          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void pdf()}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-semibold text-night hover:bg-ivory disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-burgundy"
          >
            <Download size={14} aria-hidden="true" />
            {busy === "pdf"
              ? "Preparing…"
              : "Download the measured floor plan (PDF)"}
          </button>

          <div className="mt-2 grid gap-2">
            {onSnapshot && (
              <button
                type="button"
                onClick={() => {
                  onSnapshot();
                  setOpen(false);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-semibold text-night hover:bg-ivory focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                <Camera size={14} aria-hidden="true" />
                Save a picture
              </button>
            )}
            {printHref && (
              <a
                href={printHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-semibold text-night hover:bg-ivory focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                <Printer size={14} aria-hidden="true" />
                Print chart and cards
              </a>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs text-[#9e2a2b]">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
