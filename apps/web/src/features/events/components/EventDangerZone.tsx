"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/lib/use-is-mobile";
import { DeleteEventDialog } from "./DeleteEventDialog";
import type { Event } from "@/features/events/types";
import { archiveEventAction } from "@/features/events/settings-actions";

interface EventDangerZoneProps {
  event: Event;
  isOwner: boolean;
  onError: (msg: string) => void;
}

const ROW = "flex min-h-[64px] items-center gap-3.5 px-4 py-3 sm:px-5";
const GHOST =
  "inline-flex min-h-[40px] shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

export function EventDangerZone({
  event,
  isOwner,
  onError,
}: EventDangerZoneProps) {
  const router = useRouter();
  const sheet = useIsMobile();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleArchive = async () => {
    setActionLoading(true);
    const res = await archiveEventAction(event.id);
    setActionLoading(false);
    if (!res.ok) {
      onError(res.error || "Failed to archive celebration");
      setShowArchiveModal(false);
    } else {
      router.push("/events");
    }
  };

  return (
    <section aria-labelledby="ev-danger">
      <h2 id="ev-danger" className="sr-only">
        Danger zone
      </h2>
      <div className="overflow-hidden rounded-3xl border border-error/25 bg-white/40 backdrop-blur-sm divide-y divide-hairline">
        {
          <div className={ROW}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-burgundy/[0.07] text-gold-ink">
              <Icon name="folder" size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-night">
                Archive celebration
              </span>
              <span className="block text-[12.5px] leading-snug text-label-2">
                Moves it to your archive. Nothing is deleted.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowArchiveModal(true)}
              className={`${GHOST} desk-chip text-night`}
            >
              Archive event
            </button>
          </div>
        }

        {isOwner && (
          <div className={ROW}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-error-container text-error">
              <Icon name="delete" size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-night">
                Delete celebration
              </span>
              <span className="block text-[12.5px] leading-snug text-label-2">
                Removes guests, seating and records for good.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className={`${GHOST} bg-error text-white hover:bg-error/90`}
            >
              Delete event
            </button>
          </div>
        )}
      </div>

      <DeleteEventDialog
        event={event}
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onDeleted={() => router.push("/events")}
      />

      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent sheet={sheet}>
          <DialogHeader>
            <DialogTitle>Archive Celebration?</DialogTitle>
            <DialogDescription>
              It leaves your celebrations and moves to the archive in your
              profile, where you can restore it later. Guests can no longer
              submit or revise their RSVPs.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowArchiveModal(false)}
              className={`${GHOST} text-label-2 hover:text-night`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleArchive}
              className={`${GHOST} bg-burgundy px-5 text-ivory hover:bg-wine disabled:opacity-50`}
            >
              {actionLoading ? "Archiving…" : "Confirm Archive"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
