"use client";

import React, { useEffect, useRef, useState } from "react";
import { exportInvitation } from "@/features/invitations/export-service";
import { Icon } from "@/components/ui/icon";
import { InvitationCard } from "@/features/invitations/components/InvitationCard";
import type { InvitationDesign } from "@/features/invitations/types";

interface MyInvitationProps {
  design: InvitationDesign;
  coupleName: string;
  guestName: string;
  /** Absent when access cards are off; otherwise woven into the personal entry seal. */
  entryCode?: string | null;
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
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    if (!ref.current || controller.current) return;
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setFailed(false);
    try {
      const card = ref.current.querySelector<HTMLElement>(
        "[data-invitation-canvas]"
      );
      const result = await exportInvitation({
        cardElement: card,
        design,
        eventId: "guest",
        coupleName,
        fileBaseName: `invitation-${guestName}`,
        format: "png",
        signal: active.signal,
      });
      if (!result.ok && !result.cancelled) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      controller.current = null;
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
