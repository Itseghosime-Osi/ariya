"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";

interface InvitationDownloadProps {
  guestName: string;
  title: string;
  couple: string;
  dateLine: string;
  venue: string;
  dressCode?: string | null;
  seats: number;
  /** The guest's personal QR (a data URL) and code; both absent when the host uses no cards. */
  qrCodeUrl?: string | null;
  code?: string | null;
}

const W = 1080;
const H = 1620;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed"));
    img.src = src;
  });
}

function centred(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  font: string,
  color: string,
  maxWidth = W - 200
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  // Shrink a long line to fit rather than clip it.
  let size = Number(/(\d+)px/.exec(font)?.[1] ?? 40);
  while (ctx.measureText(text).width > maxWidth && size > 22) {
    size -= 2;
    ctx.font = font.replace(/\d+px/, `${size}px`);
  }
  ctx.fillText(text, W / 2, y);
}

/** Draws this guest's invitation (with their one-time card when there is one) and saves it as a PNG. */
export function InvitationDownload(props: InvitationDownloadProps) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#5b1226");
      bg.addColorStop(1, "#2a0a14");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "#d4a85a";
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, W - 96, H - 96);
      ctx.lineWidth = 1;
      ctx.strokeRect(64, 64, W - 128, H - 128);

      const serif = "Georgia, 'Times New Roman', serif";
      centred(ctx, "YOU ARE INVITED", 190, `600 30px ${serif}`, "#d4a85a");
      centred(ctx, "for", 270, `italic 40px ${serif}`, "#f3e3c3");
      centred(ctx, props.guestName, 360, `600 84px ${serif}`, "#fff6dc");

      ctx.strokeStyle = "#d4a85a";
      ctx.beginPath();
      ctx.moveTo(W / 2 - 90, 410);
      ctx.lineTo(W / 2 + 90, 410);
      ctx.stroke();

      centred(ctx, props.title, 520, `600 64px ${serif}`, "#fff6dc");
      centred(
        ctx,
        `The celebration of ${props.couple}`,
        590,
        `italic 38px ${serif}`,
        "#f3e3c3"
      );
      centred(ctx, props.dateLine, 700, `500 40px ${serif}`, "#fff6dc");
      centred(ctx, props.venue, 765, `400 36px ${serif}`, "#f3e3c3");
      if (props.dressCode) {
        centred(
          ctx,
          `Dress code: ${props.dressCode}`,
          830,
          `italic 32px ${serif}`,
          "#d4a85a"
        );
      }

      if (props.qrCodeUrl && props.code) {
        const qr = await loadImage(props.qrCodeUrl);
        const size = 360;
        const x = (W - size) / 2;
        const y = 880;
        ctx.fillStyle = "#fff6dc";
        ctx.beginPath();
        ctx.roundRect(x - 28, y - 28, size + 56, size + 56, 28);
        ctx.fill();
        ctx.drawImage(qr, x, y, size, size);
        centred(
          ctx,
          "YOUR PERSONAL ACCESS CARD",
          y + size + 90,
          `600 28px ${serif}`,
          "#d4a85a"
        );
        centred(
          ctx,
          props.code,
          y + size + 145,
          "600 44px 'Courier New', monospace",
          "#fff6dc"
        );
        centred(
          ctx,
          `Admits ${props.seats} ${props.seats === 1 ? "guest" : "guests"}. Used once, then it is spent.`,
          y + size + 195,
          `italic 28px ${serif}`,
          "#f3e3c3"
        );
      } else {
        centred(
          ctx,
          `Admits ${props.seats} ${props.seats === 1 ? "guest" : "guests"}. Give your name at the entrance.`,
          980,
          `italic 32px ${serif}`,
          "#f3e3c3"
        );
      }

      centred(ctx, "Àríyá", H - 100, `600 30px ${serif}`, "#d4a85a");

      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, "image/png")
      );
      if (!blob) throw new Error("no blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invitation-${props.guestName.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "guest"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] px-5 text-[13px] font-semibold text-night shadow-[0_4px_14px_rgba(212,168,90,0.35)] disabled:opacity-60"
      >
        <Icon name={busy ? "refresh" : "download"} size={16} />
        {busy ? "Preparing" : "Save my invitation"}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          Could not make the image. Please try again.
        </p>
      )}
    </div>
  );
}
