"use client";

import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Icon } from "@/components/ui/icon";
import { InvitationCard } from "@/features/invitations/components/InvitationCard";
import type { InvitationDesign } from "@/features/invitations/types";

interface MyInvitationProps {
  design: InvitationDesign;
  coupleName: string;
  guestName: string;
  /** The guest's entry code. Woven into the card's entry seal; never shown as text or a QR box. */
  entryCode: string;
}

/**
 * The guest's own invitation: the host's design with their personal entry seal in it. They save it as
 * a picture and show it at the door; the scanner reads the seal. Nothing on the page calls it a code.
 */
export function MyInvitation({
  design,
  coupleName,
  guestName,
  entryCode,
}: MyInvitationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    if (!ref.current) return;
    setBusy(true);
    setFailed(false);
    try {
      const card = ref.current.querySelector<HTMLElement>(
        "[data-invitation-canvas]"
      );
      if (!card) throw new Error("no card");
      const url = await toPng(card, {
        pixelRatio: 3,
        cacheBust: true,
        width: card.offsetWidth,
        height: card.offsetHeight,
        style: { margin: "0", borderRadius: "0", transform: "none" },
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `invitation-${guestName.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "guest"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4" aria-label="Your invitation">
      <div ref={ref} className="mx-auto w-full max-w-sm">
        <InvitationCard
          design={design}
          coupleName={coupleName}
          entryCode={entryCode}
        />
      </div>
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
        <p className="mt-2 text-[11px] text-label-2">
          Keep it on your phone, or print it, and bring it with you.
        </p>
        {failed && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            Could not make the image. Please try again.
          </p>
        )}
      </div>
    </section>
  );
}
