"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { exportInvitation, type ExportFormat } from "../../export-service";
import type { InvitationDesign } from "../../types";
import { designDimensionsPx } from "../../layer-ops";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  design: InvitationDesign;
  eventId: string;
  coupleName?: string;
  getCardElement: () => HTMLElement | null;
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
    title: "Print-Ready PDF",
    badge: "Recommended for Print",
    description:
      "Vector PDF with 300 DPI imagery calibrated for professional printers.",
    resolution: "Print Standard (300 DPI)",
    icon: "document",
  },
  {
    id: "png",
    title: "High-Resolution PNG",
    badge: "Lossless (3x)",
    description:
      "Crystal clear raster with transparent or paper texture. Ideal for screens.",
    resolution: "3x Native Canvas Size",
    icon: "sparkles",
  },
  {
    id: "jpeg",
    title: "Compressed JPEG",
    badge: "Fast & Light",
    description:
      "Optimised for WhatsApp, email attachments, and instant guest preview.",
    resolution: "2x Scaled (95% Quality)",
    icon: "swatch",
  },
  {
    id: "json",
    title: "Design Backup (.json)",
    badge: "Editable Source",
    description:
      "Raw project file containing all layers, dimensions, and typography.",
    resolution: "Source Code",
    icon: "download",
  },
];

export function ExportModal({
  open,
  onClose,
  design,
  eventId,
  coupleName,
  getCardElement,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const dims = designDimensionsPx(design);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const cardEl = getCardElement();
      const res = await exportInvitation({
        cardElement: cardEl,
        design,
        eventId,
        coupleName,
        format: selectedFormat,
      });

      if (!res.ok) {
        setError(res.error || "Export failed");
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !exporting) onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-black/10 bg-ivory p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1118] dark:text-ivory"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-black/10 dark:border-white/10">
          <div>
            <h2
              id="export-dialog-title"
              className="font-serif text-2xl font-bold tracking-tight text-night dark:text-ivory"
            >
              Export Invitation
            </h2>
            <p className="mt-1 text-xs text-label-2">
              Canvas: {dims.width} × {dims.height} px • Edge:{" "}
              {design.canvas?.edgeStyle ?? "sharp"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close export dialog"
            onClick={onClose}
            disabled={exporting}
            className="rounded-full p-2 text-label-2 transition hover:bg-black/5 hover:text-night dark:hover:bg-white/10 dark:hover:text-ivory"
          >
            <span className="text-xl leading-none">✕</span>
          </button>
        </div>

        {/* Format Selection Grid */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {FORMATS.map((f) => {
            const isSelected = selectedFormat === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFormat(f.id)}
                className={`relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                  isSelected
                    ? "border-burgundy bg-burgundy/5 ring-2 ring-burgundy/20 dark:border-[#e5a93c] dark:bg-[#e5a93c]/10 dark:ring-[#e5a93c]/20"
                    : "border-hairline bg-white/60 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-semibold text-sm text-night dark:text-ivory">
                    {f.title}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide ${
                      isSelected
                        ? "bg-burgundy text-white dark:bg-[#e5a93c] dark:text-black"
                        : "bg-black/5 text-label-2 dark:bg-white/10"
                    }`}
                  >
                    {f.badge}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-label-2 leading-relaxed">
                  {f.description}
                </p>
                <span className="mt-2.5 text-[11px] font-mono text-black/40 dark:text-white/40">
                  {f.resolution}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-label-2 transition hover:text-night dark:hover:text-ivory"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-6 py-2.5 text-sm font-semibold text-ivory shadow-md transition hover:bg-burgundy/90 active:scale-98 disabled:opacity-50 dark:bg-[#e5a93c] dark:text-black dark:hover:bg-[#d4982b]"
          >
            {exporting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
    </div>
  );
}
