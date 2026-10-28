"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { getPartyDisplaySeats } from "@/lib/metrics";
import { GuestWithDetails } from "../types";
import { Star } from "lucide-react";
import { GuestRowActions } from "./GuestRowActions";

interface ColumnOptions {
  onSelectGuest: (guest: GuestWithDetails) => void;
  onCopyLink: (guest: GuestWithDetails) => void;
  onShareWhatsApp: (guest: GuestWithDetails) => void;
}

export function getGuestColumns({
  onSelectGuest,
  onCopyLink,
  onShareWhatsApp,
}: ColumnOptions): ColumnDef<GuestWithDetails>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(val) => row.toggleSelected(!!val)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Guest Name",
      cell: ({ row }) => {
        const guest = row.original;
        return (
          <div
            className="flex items-center gap-2 cursor-pointer font-medium text-on-surface hover:text-wine"
            onClick={() => onSelectGuest(guest)}
          >
            <span>{guest.name}</span>
            {guest.is_vip && (
              <span title="VIP Guest" className="inline-flex text-amber-500">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "contact",
      header: "Contact",
      cell: ({ row }) => {
        const guest = row.original;
        return (
          <div className="flex flex-col text-xs text-on-surface-variant">
            {guest.phone && <span>{guest.phone}</span>}
            {guest.email && (
              <span className="text-mist truncate max-w-[150px]">
                {guest.email}
              </span>
            )}
            {!guest.phone && !guest.email && (
              <span className="text-mist italic">No contact</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "side",
      header: "Side & Group",
      cell: ({ row }) => {
        const guest = row.original;
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-surface-container font-medium text-on-surface">
              {guest.side}
            </span>
            {guest.group_name && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-outline-variant/30 text-on-surface-variant">
                {guest.group_name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "party_size",
      header: "Party Size",
      cell: ({ row }) => {
        const guest = row.original;
        const seats = getPartyDisplaySeats(guest);
        return (
          <div className="text-xs text-on-surface">
            <span>
              {seats} {seats === 1 ? "seat" : "seats"}
            </span>
            {guest.plus_ones_allowed && (
              <span className="text-mist ml-1">(+1 allowed)</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "rsvp_status",
      header: "RSVP Status",
      cell: ({ row }) => {
        const status = row.original.rsvp?.status ?? "pending";
        const variants: Record<string, "confirmed" | "declined" | "awaiting"> =
          {
            accepted: "confirmed",
            declined: "declined",
            pending: "awaiting",
          };
        return (
          <Badge
            variant={variants[status] || "awaiting"}
            className="capitalize text-xs"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "seated_status",
      header: "Table Seating",
      cell: ({ row }) => {
        const guest = row.original;
        if (guest.seat?.table_name) {
          return (
            <Badge
              variant="outline"
              className="text-xs border-gold/40 text-wine bg-gold/5"
            >
              {guest.seat.table_name}
            </Badge>
          );
        }
        return <span className="text-xs text-mist italic">Unassigned</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <GuestRowActions
          guest={row.original}
          onSelect={onSelectGuest}
          onCopyLink={onCopyLink}
          onShareWhatsApp={onShareWhatsApp}
        />
      ),
    },
  ];
}
