"use client";

import * as React from "react";
import { m } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPartyDisplaySeats } from "@/lib/metrics";
import { GuestWithDetails } from "../types";
import { ChevronLeft, ChevronRight, Upload, UserPlus } from "lucide-react";

type GuestAction = (guest: GuestWithDetails) => void;

interface GuestLedgerProps {
  guests: GuestWithDetails[];
  totalCount: number;
  hasFilters: boolean;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onSelectGuest: GuestAction;
  onCopyLink: GuestAction;
  onShareWhatsApp: GuestAction;
  onOpenAdd: () => void;
  onOpenImport: () => void;
}

const STATUS = {
  accepted: { label: "Attending", className: "text-success" },
  declined: { label: "Declined", className: "text-error" },
  pending: { label: "Awaiting reply", className: "text-gold-ink" },
} as const;

export function GuestLedger({
  guests,
  totalCount,
  hasFilters,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onSelectGuest,
  onCopyLink,
  onShareWhatsApp,
  onOpenAdd,
  onOpenImport,
}: GuestLedgerProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <p className="py-10 text-center text-on-surface-variant">
          Loading guests...
        </p>
      ) : guests.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onOpenAdd={onOpenAdd}
          onOpenImport={onOpenImport}
        />
      ) : (
        <ul className="flex flex-col">
          {guests.map((guest, index) => {
            const seats = getPartyDisplaySeats(guest);
            const status = STATUS[guest.rsvp?.status ?? "pending"];
            const detail = [
              guest.side ? `${capitalise(guest.side)} side` : null,
              guest.group_name,
              guest.seat?.table_name,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <m.li
                key={guest.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  visualDuration: 0.4,
                  bounce: 0.1,
                  delay: Math.min(index, 12) * 0.03,
                }}
                className="group flex items-center rounded-2xl border-t border-outline-variant/60 first:border-t-0"
              >
                <button
                  type="button"
                  onClick={() => onSelectGuest(guest)}
                  className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 rounded-2xl px-2 py-4 text-left transition-colors hover:bg-ivory sm:grid-cols-[auto_minmax(0,1fr)_5.5rem_9rem] sm:px-3"
                >
                  <span
                    aria-hidden="true"
                    className="row-span-2 flex h-11 w-11 items-center justify-center rounded-full bg-wine/10 font-serif text-base font-bold text-wine transition-colors group-hover:bg-wine group-hover:text-ivory sm:row-span-1"
                  >
                    {initials(guest.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-lg font-medium leading-tight text-on-surface transition-colors group-hover:text-wine">
                      {guest.name}
                      {guest.is_vip && (
                        <span className="ml-2 align-[2px] font-sans text-[10px] font-bold tracking-[0.12em] text-gold-ink">
                          VIP
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-on-surface-variant">
                      {detail || "No group"}
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 text-sm font-semibold sm:order-4 ${status.className}`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-current"
                    />
                    {status.label}
                  </span>
                  <span className="text-xs tabular-nums text-on-surface-variant sm:order-3 sm:text-sm">
                    {seats} {seats === 1 ? "seat" : "seats"}
                  </span>
                </button>

                <div className="hidden items-center gap-4 pr-3 text-xs font-semibold text-on-surface-variant opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 md:flex">
                  <button
                    type="button"
                    onClick={() => onCopyLink(guest)}
                    className="min-h-11 underline decoration-outline-variant underline-offset-4 hover:text-wine"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => onShareWhatsApp(guest)}
                    className="min-h-11 underline decoration-outline-variant underline-offset-4 hover:text-wine"
                  >
                    WhatsApp
                  </button>
                </div>
              </m.li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant/60 pt-4 text-xs text-on-surface-variant sm:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger
              aria-label="Rows per page"
              className="h-8 w-18 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-2">
            Showing {startRow}-{endRow} of {totalCount} guests
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-2"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <span className="px-2 font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-2"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  onOpenAdd,
  onOpenImport,
}: {
  hasFilters: boolean;
  onOpenAdd: () => void;
  onOpenImport: () => void;
}) {
  if (hasFilters) {
    return (
      <p className="py-12 text-center text-on-surface-variant">
        No guests found matching your criteria.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-wine/10 font-serif text-2xl font-bold text-wine"
      >
        À
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl font-bold text-on-surface">
          Your guest list starts here
        </h2>
        <p className="max-w-sm text-sm text-on-surface-variant">
          Add the first guest by hand, or bring in a spreadsheet and send every
          party their own RSVP link.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={onOpenAdd} className="rounded-full px-6">
          <UserPlus className="mr-2 h-4 w-4" />
          Add the first guest
        </Button>
        <Button
          variant="outline"
          onClick={onOpenImport}
          className="rounded-full border-gold/50 px-5"
        >
          <Upload className="mr-2 h-4 w-4 text-gold-ink" />
          Upload a spreadsheet
        </Button>
      </div>
    </div>
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
