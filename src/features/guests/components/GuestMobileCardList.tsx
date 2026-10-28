"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPartyDisplaySeats } from "@/lib/metrics";
import { formatPhone } from "@/lib/format";
import type { GuestWithDetails } from "../types";
import { Copy, MessageSquare, ChevronRight } from "lucide-react";

interface GuestMobileCardListProps {
  guests: GuestWithDetails[];
  isLoading?: boolean;
  onSelectGuest: (guest: GuestWithDetails) => void;
  onCopyLink: (guest: GuestWithDetails) => void;
  onShareWhatsApp: (guest: GuestWithDetails) => void;
}

export function GuestMobileCardList({
  guests,
  isLoading,
  onSelectGuest,
  onCopyLink,
  onShareWhatsApp,
}: GuestMobileCardListProps) {
  if (isLoading) {
    return (
      <div className="sm:hidden p-8 text-center text-xs text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/50">
        Loading guests...
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="sm:hidden p-8 text-center text-xs text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/50">
        No guests found matching your criteria.
      </div>
    );
  }

  const rsvpBadgeVariant: Record<
    string,
    "confirmed" | "declined" | "awaiting"
  > = {
    accepted: "confirmed",
    declined: "declined",
    pending: "awaiting",
  };

  return (
    <div className="sm:hidden space-y-3">
      {guests.map((guest) => {
        const seats = getPartyDisplaySeats(guest);
        const status = guest.rsvp?.status ?? "pending";

        return (
          <div
            key={guest.id}
            className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <button
                  type="button"
                  onClick={() => onSelectGuest(guest)}
                  className="font-medium text-sm text-on-surface hover:text-wine text-left flex items-center gap-1.5"
                >
                  <span>{guest.name}</span>
                  {guest.is_vip && (
                    <Badge
                      variant="outline"
                      className="border-gold/60 text-gold text-[10px] py-0 px-1.5"
                    >
                      VIP
                    </Badge>
                  )}
                </button>
                <div className="text-xs text-neutral-600 flex items-center gap-1.5 mt-0.5">
                  <span>{guest.side || "General"}</span>
                  {guest.group_name && <span>• {guest.group_name}</span>}
                  {guest.phone && <span>• {formatPhone(guest.phone)}</span>}
                </div>
              </div>

              <Badge
                variant={rsvpBadgeVariant[status] || "awaiting"}
                className="capitalize text-xs shrink-0"
              >
                {status}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-800">
                  {seats} {seats === 1 ? "seat" : "seats"}
                </span>
                <span className="text-neutral-400">•</span>
                {guest.seat?.table_name ? (
                  <Badge
                    variant="outline"
                    className="text-[11px] border-gold/40 text-wine bg-gold/5"
                  >
                    {guest.seat.table_name}
                  </Badge>
                ) : (
                  <span className="text-neutral-500 italic">Unassigned</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopyLink(guest)}
                  className="h-8 w-8 p-0 text-neutral-700 hover:text-wine"
                  title="Copy personal link"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span className="sr-only">Copy link</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShareWhatsApp(guest)}
                  className="h-8 w-8 p-0 text-emerald-700 hover:text-emerald-800"
                  title="Send via WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="sr-only">WhatsApp</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectGuest(guest)}
                  className="h-8 w-8 p-0 text-neutral-700 hover:text-wine"
                  title="View details"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Details</span>
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
