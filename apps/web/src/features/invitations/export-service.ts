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
}

/** Export uses document pixels, never the viewport's fitted/zoomed dimensions. */
export function invitationExportSize(
  design: InvitationDesign,
  format: ExportFormat,
  pixelRatio = 3
) {
  const dims = designDimensionsPx(design);
  const requested =
    format === "pdf"
      ? 1500 / dims.width
      : format === "jpeg"
        ? Math.min(2, pixelRatio)
        : pixelRatio;
  const scale = Math.min(
    requested,
    8192 / dims.width,
    8192 / dims.height,
    Math.sqrt(24_000_000 / (dims.width * dims.height))
  );
  return {
    width: Math.floor(dims.width * scale),
    height: Math.floor(dims.height * scale),
    scale,
    widthPt: 360,
    heightPt: (360 * dims.height) / dims.width,
  };
}
function download(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function bytes(url: string) {
  const data = atob(url.split(",")[1]);
  return Uint8Array.from(data, (c) => c.charCodeAt(0));
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
  const name =
    (coupleName ? `${coupleName}-invitation` : `invitation-${eventId}`)
      .replace(/[^\p{L}\p{N}\-_]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "invitation";
  let wrapper: HTMLDivElement | undefined;
  try {
    if (format === "json") {
      downloadBlob(
        new Blob([JSON.stringify(design, null, 2)], {
          type: "application/json",
        }),
        `${name}.json`
      );
      return { ok: true };
    }
    if (!cardElement)
      throw new Error(
        "The invitation is not ready to export. Please try again."
      );
    if (!["png", "jpeg", "pdf"].includes(format))
      throw new Error("Unsupported export format.");
    await document.fonts.ready;
    const dims = designDimensionsPx(design);
    const size = invitationExportSize(design, format, pixelRatio);
    if (format === "pdf" && size.width !== 1500)
      throw new Error(
        "These proportions exceed the print export limit. Choose an image export or adjust the invitation size."
      );
    wrapper = document.createElement("div");
    wrapper.style.cssText = `position:fixed;left:-100000px;top:0;width:${dims.width}px;height:${dims.height}px;pointer-events:none;`;
    const clone = cardElement.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, {
      width: `${dims.width}px`,
      height: `${dims.height}px`,
      maxWidth: "none",
      margin: "0",
      transform: "none",
      boxShadow: "none",
    });
    // The live preview contains selection outlines; these are studio chrome, not artwork.
    clone.querySelectorAll<HTMLElement>("[data-layer-id]").forEach((layer) => {
      layer.style.outline = "none";
      layer.style.outlineOffset = "0";
      layer.removeAttribute("contenteditable");
      layer.removeAttribute("data-editing-text");
    });
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    // Images are also painted as CSS backgrounds on cards and framed layers.
    const images = new Map<string, Promise<string>>();
    const loadImage = (src: string) => {
      if (!images.has(src))
        images.set(
          src,
          (async () => {
            let resolved = src;
            if (!src.startsWith("data:") && !src.startsWith("blob:")) {
              const url = new URL(src, window.location.origin);
              if (url.origin !== window.location.origin)
                resolved = `/api/invitations/image-proxy?url=${encodeURIComponent(url.href)}`;
            }
            const image = new Image();
            image.src = resolved;
            try {
              await image.decode();
            } catch {
              throw new Error(
                "A picture could not be loaded for export. Replace it or try again; no incomplete file was downloaded."
              );
            }
            return resolved;
          })()
        );
      return images.get(src)!;
    };
    await Promise.all([
      ...Array.from(clone.querySelectorAll("img")).map(async (image) => {
        image.src = await loadImage(image.src);
      }),
      ...Array.from(clone.querySelectorAll<HTMLElement>("[style]"))
        .filter((el) => el.style.backgroundImage.includes("url("))
        .map(async (el) => {
          const original = el.style.backgroundImage;
          const matches = [
            ...original.matchAll(
              /url\((?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^']*)'|([^)]*))\)/g
            ),
          ];
          let background = original;
          for (const match of matches) {
            const src = (match[1] ?? match[2] ?? match[3]).replace(
              /\\(["\\])/g,
              "$1"
            );
            background = background.replace(
              match[0],
              `url(${JSON.stringify(await loadImage(src))})`
            );
          }
          el.style.backgroundImage = background;
        }),
    ]);
    const options = {
      width: dims.width,
      height: dims.height,
      canvasWidth: size.width,
      canvasHeight: size.height,
      pixelRatio: 1,
      cacheBust: false,
      style: {
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        transform: "none",
        margin: "0",
      },
      backgroundColor: format === "jpeg" ? design.palette.paper : undefined,
    };
    const image =
      format === "jpeg"
        ? await toJpeg(clone, { ...options, quality })
        : await toPng(clone, options);
    if (format !== "pdf") {
      download(image, `${name}.${format === "jpeg" ? "jpg" : "png"}`);
      return { ok: true };
    }
    const pdf = await PDFDocument.create();
    const embedded = await pdf.embedPng(bytes(image));
    const page = pdf.addPage([size.widthPt, size.heightPt]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: size.widthPt,
      height: size.heightPt,
    });
    pdf.setTitle(coupleName ? `${coupleName} — Invitation` : "Invitation");
    pdf.setAuthor("Àríyá");
    pdf.setCreator("Àríyá Invitation Studio");
    const data = await pdf.save();
    downloadBlob(
      new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/pdf" }),
      `${name}-print.pdf`
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Export failed. Please try again.",
    };
  } finally {
    wrapper?.remove();
  }
}
