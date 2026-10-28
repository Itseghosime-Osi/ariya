"use client";

import * as React from "react";
import { GuestWithDetails } from "../types";
import { GuestEditForm } from "./GuestEditForm";
import { GuestDetailTokenCard } from "./GuestDetailTokenCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Edit2, Trash2, Star } from "lucide-react";

interface GuestDetailDrawerProps {
  eventId: string;
  eventName: string;
  guest: GuestWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onGuestUpdated: (guest: GuestWithDetails) => void;
  onRequestDelete: (guest: GuestWithDetails) => void;
}

export function GuestDetailDrawer({
  eventId,
  eventName,
  guest,
  isOpen,
  onClose,
  onGuestUpdated,
  onRequestDelete,
}: GuestDetailDrawerProps) {
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    setIsEditing(false);
  }, [guest?.id, isOpen]);

  if (!isOpen || !guest) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-night/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative flex h-full w-full max-w-md flex-col bg-surface-container-lowest shadow-2xl overflow-y-auto p-6 border-l border-outline-variant/60">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-bold text-on-surface">
              {isEditing ? "Edit Guest" : "Guest Details"}
            </h2>
            {guest.is_vip && (
              <Badge
                variant="outline"
                className="border-amber-400 text-amber-600 bg-amber-50"
              >
                <Star className="h-3 w-3 mr-1 fill-amber-500" /> VIP
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-lg p-1 text-mist hover:text-on-surface hover:bg-surface-container"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isEditing ? (
          <div className="py-4">
            <GuestEditForm
              eventId={eventId}
              guest={guest}
              onSuccess={(updated) => {
                onGuestUpdated(updated);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-4 text-sm">
            <div>
              <div className="text-xl font-semibold text-on-surface">
                {guest.name}
              </div>
              <div className="text-xs text-mist mt-0.5">
                {guest.phone || "No phone"} • {guest.email || "No email"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-container/50 border border-outline-variant/40">
              <div>
                <span className="text-xs text-mist block">Side / Group</span>
                <span className="font-medium capitalize text-on-surface">
                  {guest.side} {guest.group_name ? `(${guest.group_name})` : ""}
                </span>
              </div>
              <div>
                <span className="text-xs text-mist block">Party Size</span>
                <span className="font-medium text-on-surface">
                  {guest.party_size}{" "}
                  {guest.plus_ones_allowed ? "(+1 allowed)" : ""}
                </span>
              </div>
              <div>
                <span className="text-xs text-mist block">RSVP Status</span>
                <Badge
                  variant={
                    guest.rsvp?.status === "accepted"
                      ? "confirmed"
                      : guest.rsvp?.status === "declined"
                        ? "declined"
                        : "awaiting"
                  }
                >
                  {guest.rsvp?.status ?? "pending"}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-mist block">Seating</span>
                <span className="font-medium text-on-surface">
                  {guest.seat?.table_name || "Unassigned"}
                </span>
              </div>
            </div>

            <GuestDetailTokenCard
              eventId={eventId}
              eventName={eventName}
              guestId={guest.id}
              guestName={guest.name}
              guestPhone={guest.phone}
              rsvpToken={guest.rsvp_token}
              onTokenUpdated={(newToken) =>
                onGuestUpdated({ ...guest, rsvp_token: newToken })
              }
            />

            {guest.notes && (
              <div className="rounded-xl bg-surface-container/30 p-3 text-xs">
                <span className="font-semibold text-on-surface-variant block mb-1">
                  Notes & Dietary
                </span>
                <p className="text-on-surface">{guest.notes}</p>
              </div>
            )}

            <div className="mt-auto flex items-center justify-between pt-6 border-t border-outline-variant/40">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRequestDelete(guest)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" /> Remove
              </Button>
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1.5" /> Edit Guest
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
