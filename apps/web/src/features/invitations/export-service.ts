"use client";

import { toPng, toJpeg } from "html-to-image";
import { PDFDocument } from "pdf-lib";
import type { InvitationDesign } from "./types";
import { designDimensionsPx } from "./layer-ops";

export type ExportFormat = "png" | "jpeg" | "pdf" | "json";

export interface ExportOptions {
  format: ExportFormat;
  pixelRatio?: number;
  quality?: number;
  includeBleed?: boolean;
}

function sanitizeFilename(name: string): string {
  return (
    name.replace(/[^\p{L}\p{N}\-_]+/gu, "-").replace(/^-+|-+$/g, "") ||
    "invitation"
  );
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid data URL");
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function proxyExternalImages(cardElement: HTMLElement): () => void {
  if (typeof window === "undefined") return () => {};
  const images = cardElement.querySelectorAll<HTMLImageElement>("img");
  const originalSrcs: Array<{ img: HTMLImageElement; src: string }> = [];

  images.forEach((img) => {
    const src = img.src;
    if (src && !src.startsWith("data:") && !src.startsWith("blob:")) {
      try {
        const u = new URL(src, window.location.origin);
        if (
          u.origin !== window.location.origin &&
          !src.includes("/api/invitations/image-proxy")
        ) {
          originalSrcs.push({ img, src });
          img.src = `/api/invitations/image-proxy?url=${encodeURIComponent(src)}`;
        }
      } catch {
        // ignore
      }
    }
  });

  return () => {
    originalSrcs.forEach(({ img, src }) => {
      img.src = src;
    });
  };
}

export async function exportInvitation({
  cardElement,
  design,
  eventId,
  coupleName,
  format,
  pixelRatio = 3,
  quality = 0.95,
}: {
  cardElement: HTMLElement | null;
  design: InvitationDesign;
  eventId: string;
  coupleName?: string;
  format: ExportFormat;
  pixelRatio?: number;
  quality?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const baseName = sanitizeFilename(
    coupleName ? `${coupleName}-invitation` : `invitation-${eventId}`
  );

  const restoreImages = cardElement
    ? proxyExternalImages(cardElement)
    : () => {};

  try {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(design, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${baseName}.json`);
      URL.revokeObjectURL(url);
      return { ok: true };
    }

    if (!cardElement) {
      return { ok: false, error: "Canvas element not found for export." };
    }

    // Render options
    const renderWidth = cardElement.offsetWidth;
    const renderHeight = cardElement.offsetHeight;

    // Safe render options to prevent CORS-tainted canvas failures
    const renderOptions = {
      pixelRatio,
      cacheBust: true,
      width: renderWidth,
      height: renderHeight,
      fetchRequestInit: {
        mode: "cors" as RequestMode,
      },
      imagePlaceholder:
        "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100%25' height='100%25' fill='%23b8864b'/%3E%3C/svg%3E",
      style: {
        margin: "0",
        transform: "none",
      },
    };

    const safeToPng = async (el: HTMLElement, opts = renderOptions) => {
      try {
        return await toPng(el, opts);
      } catch {
        // Fallback with skipped webfonts if cross-origin fonts blocked canvas
        return await toPng(el, { ...opts, skipFonts: true });
      }
    };

    if (format === "png") {
      const dataUrl = await safeToPng(cardElement);
      triggerDownload(dataUrl, `${baseName}-300dpi.png`);
      return { ok: true };
    }

    if (format === "jpeg") {
      let dataUrl: string;
      try {
        dataUrl = await toJpeg(cardElement, {
          ...renderOptions,
          pixelRatio: Math.min(pixelRatio, 2),
          quality,
        });
      } catch {
        dataUrl = await toJpeg(cardElement, {
          ...renderOptions,
          skipFonts: true,
          pixelRatio: Math.min(pixelRatio, 2),
          quality,
        });
      }
      triggerDownload(dataUrl, `${baseName}.jpg`);
      return { ok: true };
    }

    if (format === "pdf") {
      // 1. Capture 3x PNG for crystal clear 300 DPI print quality
      const pngDataUrl = await safeToPng(cardElement, {
        ...renderOptions,
        pixelRatio: 3,
      });

      const pngBytes = dataUrlToUint8Array(pngDataUrl);
      const pdfDoc = await PDFDocument.create();
      const embeddedImage = await pdfDoc.embedPng(pngBytes);

      // 2. Standard 5x7 ratio (360pt x 504pt) or proportional points
      const dims = designDimensionsPx(design);
      const ptWidth = 360;
      const ptHeight = Math.round((dims.height / dims.width) * ptWidth);

      const page = pdfDoc.addPage([ptWidth, ptHeight]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: ptWidth,
        height: ptHeight,
      });

      pdfDoc.setTitle(
        coupleName ? `${coupleName} - Wedding Invitation` : "Wedding Invitation"
      );
      pdfDoc.setAuthor("Àríyá");
      pdfDoc.setCreator("Àríyá Design Studio");

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${baseName}-print.pdf`);
      URL.revokeObjectURL(url);
      return { ok: true };
    }

    return { ok: false, error: "Unsupported format" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    restoreImages();
  }
}
