"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { EventFilm, type FilmEvent } from "./EventFilm";
import type { FilmDesign } from "./design";

interface FilmGateProps {
  design: FilmDesign;
  event: FilmEvent;
  guestName?: string | null;
  finale: React.ReactNode;
  ctaLabel?: string;
  /** Remembers, for this tab, that the film has been watched, so a refresh does not replay it. */
  storageKey: string;
}

/**
 * Plays the film over the page the first time someone opens it, then leaves a small "Watch the film"
 * button so it can be watched again. The page underneath is the real page; the film is only a front door.
 */
export function FilmGate({
  design,
  event,
  guestName,
  finale,
  ctaLabel,
  storageKey,
}: FilmGateProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(storageKey)) setOpen(false);
    } catch {
      // No storage: the film simply plays every visit.
    }
  }, [storageKey]);

  const close = () => {
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage errors.
    }
    setOpen(false);
  };

  if (open) {
    return (
      <EventFilm
        design={design}
        event={event}
        guestName={guestName}
        finale={finale}
        ctaLabel={ctaLabel}
        onClose={close}
      />
    );
  }

  return (
    <button
      type="button"
      className="efilm-again desk-chip inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold text-burgundy shadow-md"
      onClick={() => setOpen(true)}
    >
      <Icon name="celebration" size={14} />
      Watch the film
    </button>
  );
}
