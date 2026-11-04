"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { Event } from "@/features/events/types";
import {
  archiveEventAction,
  deleteEventAction,
} from "@/features/events/settings-actions";

interface EventDangerZoneProps {
  event: Event;
  isOwner: boolean;
  onError: (msg: string) => void;
}

export function EventDangerZone({
  event,
  isOwner,
  onError,
}: EventDangerZoneProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
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

  const handleDelete = async () => {
    if (confirmSlug !== event.slug) return;
    setActionLoading(true);
    const res = await deleteEventAction(event.id);
    setActionLoading(false);
    if (!res.ok) {
      onError(res.error || "Failed to delete celebration");
      setShowDeleteModal(false);
    } else {
      router.push("/events");
    }
  };

  return (
    <>
      <div className="bg-surface-container-low p-6 sm:p-8 rounded-2xl border border-error/30 space-y-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="font-serif text-xl text-wine font-medium">
            Danger Zone
          </h2>
          <p className="text-xs text-on-surface-variant">
            Archiving closes RSVP access. Deleting removes all guests, seating,
            and records.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
          <div>
            <h3 className="text-xs font-semibold text-night">
              Archive Celebration
            </h3>
            <p className="text-[11px] text-on-surface-variant">
              Sets status to archived and closes active RSVP submissions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowArchiveModal(true)}
            className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors"
          >
            Archive Event
          </button>
        </div>

        {isOwner && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-error/20 bg-error-container/20">
            <div>
              <h3 className="text-xs font-semibold text-night">
                Permanently Delete Celebration
              </h3>
              <p className="text-[11px] text-on-surface-variant">
                Irrevocably deletes this celebration, along with guest lists and
                table layouts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-error text-white text-xs font-semibold hover:bg-error/90 transition-colors shadow-sm"
            >
              Delete Event
            </button>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-night/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl max-w-md w-full space-y-5 border border-outline-variant/40 shadow-2xl">
            <div className="space-y-1">
              <h3 className="font-serif text-xl text-error font-medium">
                Confirm Permanent Deletion
              </h3>
              <p className="text-xs text-on-surface-variant">
                This action cannot be undone. To confirm, type the slug{" "}
                <strong className="font-mono text-night">{event.slug}</strong>:
              </p>
            </div>
            <input
              type="text"
              value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)}
              placeholder={event.slug}
              className="w-full px-3.5 py-2.5 rounded-xl border border-error/40 text-sm font-mono text-night focus:outline-none focus:ring-2 focus:ring-error/40"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmSlug !== event.slug || actionLoading}
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl bg-error text-white text-xs font-semibold hover:bg-error/90 disabled:opacity-50 transition-all"
              >
                {actionLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showArchiveModal && (
        <div className="fixed inset-0 z-50 bg-night/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl max-w-md w-full space-y-5 border border-outline-variant/40 shadow-2xl">
            <div className="space-y-1">
              <h3 className="font-serif text-xl text-wine font-medium">
                Archive Celebration?
              </h3>
              <p className="text-xs text-on-surface-variant">
                Guests will no longer be able to submit or revise their RSVPs.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleArchive}
                className="px-5 py-2 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 disabled:opacity-50 transition-all"
              >
                {actionLoading ? "Archiving..." : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
