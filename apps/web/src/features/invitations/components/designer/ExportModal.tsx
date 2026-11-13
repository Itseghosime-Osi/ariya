"use client";

import { recordStudioMetricAction } from "../../metrics-actions";
import { describeExportFailure } from "../../export-errors";
import { failedCardFonts } from "../../font-check";
import React, { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { dialogTheme } from "./dialog-theme";
import {
  exportInvitation,
  invitationExportSize,
  type ExportFormat,
} from "../../export-service";
import type { InvitationDesign } from "../../types";
import { designDimensionsPx } from "../../layer-ops";

interface ExportModalProps {
  dark?: boolean;
  open: boolean;
  onClose: () => void;
  design: InvitationDesign;
  eventId: string;
  coupleName?: string;
  getCardElement: () => HTMLElement | null;
  /** Called after a file has been handed to the browser, so the studio can confirm it. */
  onExported?: (format: ExportFormat, missingFonts: string[]) => void;
}

interface FormatCard {
  id: ExportFormat;
  title: string;
  badge: string;
  description: string;
  resolution: string;
  icon: "download" | "document" | "sparkles" | "swatch";
}

const FORMATS: FormatCard[] = [
  {
    id: "pdf",
    title: "PDF for printing",
    badge: "Print",
    description: "A flat PDF at 300 DPI, 5 inches wide. Best for a printer.",
    resolution: "300 DPI · 5 inches wide",
    icon: "document",
  },
  {
    id: "png",
    title: "High-Resolution PNG",
    badge: "Lossless",
    description: "A sharp picture for screens and sharing.",
    resolution: "3x Native Canvas Size",
    icon: "sparkles",
  },
  {
    id: "jpeg",
    title: "Compressed JPEG",
    badge: "Light",
    description: "A medium-size picture for email and quick previews.",
    resolution: "2x Scaled (95% Quality)",
    icon: "swatch",
  },
  {
    id: "whatsapp",
    title: "Small for WhatsApp",
    badge: "Under 400 KB",
    description: "Sends fast on a slow connection and still reads on a phone.",
    resolution: "Up to 1600 px, compressed",
    icon: "swatch",
  },
  {
    id: "json",
    title: "Design Backup (.json)",
    badge: "Editable",
    description:
      "A copy you can open again in the studio, with every layer kept.",
    resolution: "Editable design",
    icon: "download",
  },
];

export function ExportModal({
  open,
  dark = false,
  onClose,
  design,
  eventId,
  coupleName,
  getCardElement,
  onExported,
}: ExportModalProps) {
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const close = () => {
    controller.current?.abort();
    onClose();
  };
  const returnFocus = useRef<HTMLElement | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [exporting, setExporting] = useState(false);
  const [printMarks, setPrintMarks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const dims = designDimensionsPx(design);

  const handleExport = async () => {
    const active = new AbortController();
    controller.current = active;
    setExporting(true);
    setError(null);
    try {
      const cardEl = getCardElement();
      const missingFonts = failedCardFonts(cardEl);
      const res = await exportInvitation({
        cardElement: cardEl,
        design,
        eventId,
        coupleName,
        format: selectedFormat,
        printMarks: selectedFormat === "pdf" && printMarks,
        signal: active.signal,
      });

      if (res.cancelled) return;
      if (!res.ok) {
        setError(describeExportFailure(res.error));
        void recordStudioMetricAction({
          eventId,
          kind: "export_failed",
          format: selectedFormat,
          ms: Math.round(performance.now()),
        });
      } else {
        void recordStudioMetricAction({
          eventId,
          kind: "export_ok",
          format: selectedFormat,
          ms: Math.round(performance.now()),
        });
        onExported?.(selectedFormat, missingFonts);
        onClose();
      }
    } catch (err) {
      setError(describeExportFailure(err));
      void recordStudioMetricAction({
        eventId,
        kind: "export_failed",
        format: selectedFormat,
        ms: Math.round(performance.now()),
      });
    } finally {
      setExporting(false);
    }
  };

  const t = dialogTheme(dark);
  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-gold)]";
  const sizeOf = (f: ExportFormat) =>
    f === "json"
      ? "Editable design backup"
      : f === "pdf"
        ? `5 × ${((dims.height / dims.width) * 5).toFixed(2)} in · 300 DPI`
        : `${invitationExportSize(design, f).width} × ${invitationExportSize(design, f).height} px`;
  const hasSeal = design.layers.some(
    (layer) => layer.kind === "code" && layer.visible
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            returnFocus.current = document.activeElement as HTMLElement;
            setError(null);
            // Land on the chosen format, so Enter or Tab goes straight to the decision.
            e.preventDefault();
            document.getElementById(`export-format-${selectedFormat}`)?.focus();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus.current?.focus();
          }}
          onEscapeKeyDown={close}
          aria-describedby={undefined}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-dialog-title"
          className={cn(
            "fixed inset-0 z-(--studio-z-overlay) flex items-center justify-center p-4 backdrop-blur-md",
            t.overlay
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className={cn(
              "relative flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border shadow-2xl",
              t.panel
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header stays put */}
            <div
              className={cn(
                "flex items-start justify-between gap-4 border-b px-6 pb-4 pt-5",
                t.divider
              )}
            >
              <div>
                <Dialog.Title asChild>
                  <h2
                    id="export-dialog-title"
                    className={cn(
                      "font-serif text-2xl font-bold tracking-tight",
                      t.title
                    )}
                  >
                    Export Invitation
                  </h2>
                </Dialog.Title>
                <p className={cn("mt-1 text-xs", t.muted)}>
                  Canvas: {dims.width} × {dims.height} px • Edge:{" "}
                  {design.canvas?.edgeStyle ?? "sharp"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close export dialog"
                onClick={close}
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-full transition",
                  t.ghost,
                  focusRing
                )}
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  ✕
                </span>
              </button>
            </div>

            {/* Only this part scrolls */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <p className={cn("mb-2 text-xs font-semibold", t.muted)}>
                What is it for?
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {FORMATS.map((f) => {
                  const on = selectedFormat === f.id;
                  return (
                    <button
                      key={f.id}
                      id={`export-format-${f.id}`}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelectedFormat(f.id)}
                      className={cn(
                        "flex min-h-[7.25rem] flex-col items-start rounded-2xl border p-3.5 text-left transition-colors",
                        f.id === "json" && "sm:col-span-2 sm:min-h-0",
                        on ? t.cardOn : t.card,
                        focusRing
                      )}
                    >
                      <span className="text-sm font-semibold">{f.title}</span>
                      <span
                        className={cn(
                          "mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
                          on ? t.badgeOn : t.badge
                        )}
                      >
                        {f.badge}
                      </span>
                      <span
                        className={cn("mt-2 text-xs leading-relaxed", t.muted)}
                      >
                        {f.description}
                      </span>
                      <span
                        className={cn(
                          "mt-auto pt-2 font-mono text-xs",
                          t.muted
                        )}
                      >
                        {sizeOf(f.id)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedFormat === "pdf" && (
                <label
                  className={cn(
                    "mt-3 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs",
                    t.well
                  )}
                >
                  <input
                    type="checkbox"
                    data-testid="export-print-marks"
                    checked={printMarks}
                    onChange={(e) => setPrintMarks(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--studio-wine)]"
                  />
                  <span className={cn("leading-relaxed", t.muted)}>
                    <strong className="text-sm font-semibold text-inherit">
                      <span
                        className={cn(
                          dark
                            ? "text-[var(--studio-cream)]"
                            : "text-[var(--studio-ink)]"
                        )}
                      >
                        Add bleed and crop marks for a print shop
                      </span>
                    </strong>
                    <br />
                    Adds 0.125 in of bleed by stretching the card&rsquo;s edges
                    outwards, plus crop marks. Pictures are not extended. Keep
                    important words inside the green safe-area guide.
                  </span>
                </label>
              )}

              <p
                data-testid="export-summary"
                aria-live="polite"
                className={cn("mt-3 text-xs", t.muted)}
              >
                You will get:{" "}
                <strong
                  className={
                    dark
                      ? "text-[var(--studio-cream)]"
                      : "text-[var(--studio-ink)]"
                  }
                >
                  {FORMATS.find((f) => f.id === selectedFormat)?.title}
                </strong>
                {" · "}
                {selectedFormat === "json"
                  ? "an editable backup you can open again in the studio"
                  : selectedFormat === "whatsapp"
                    ? `${invitationExportSize(design, "whatsapp").width} × ${invitationExportSize(design, "whatsapp").height} px, compressed to about 400 KB or less`
                    : selectedFormat === "pdf"
                      ? printMarks
                        ? `${(5 + 0.75).toFixed(2)} × ${((dims.height / dims.width) * 5 + 0.75).toFixed(2)} in page with bleed and crop marks, card trims to 5 × ${((dims.height / dims.width) * 5).toFixed(2)} in`
                        : `5 × ${((dims.height / dims.width) * 5).toFixed(2)} in at 300 DPI`
                      : `${invitationExportSize(design, selectedFormat).width} × ${invitationExportSize(design, selectedFormat).height} px`}
                .
              </p>

              {error && (
                <div
                  role="alert"
                  className={cn(
                    "mt-3 flex items-start justify-between gap-3 rounded-xl p-3 text-xs font-medium",
                    t.error
                  )}
                >
                  <span>{error}</span>
                  <button
                    type="button"
                    data-testid="export-retry"
                    onClick={handleExport}
                    disabled={exporting}
                    className={cn(
                      "min-h-11 shrink-0 rounded-full px-3 font-bold underline disabled:opacity-50",
                      focusRing
                    )}
                  >
                    Try again
                  </button>
                </div>
              )}

              {hasSeal && (
                <p
                  role="note"
                  className={cn(
                    "mt-3 rounded-xl border p-3 text-xs leading-relaxed",
                    t.well,
                    t.muted
                  )}
                >
                  This artwork contains a sample entry seal. Guests receive
                  their own pass after accepting their personal invitation.
                </p>
              )}
            </div>

            {/* The decision stays in view */}
            <div
              className={cn(
                "flex items-center justify-end gap-3 border-t px-6 py-3",
                t.divider
              )}
            >
              <button
                type="button"
                onClick={close}
                className={cn(
                  "min-h-11 rounded-full px-5 text-sm font-semibold transition",
                  t.ghost,
                  focusRing
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold shadow-md transition disabled:opacity-50",
                  t.primary,
                  focusRing
                )}
              >
                {exporting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
                    Preparing {selectedFormat.toUpperCase()}…
                  </>
                ) : (
                  <>
                    <Icon name="download" size={16} />
                    Download {selectedFormat.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
