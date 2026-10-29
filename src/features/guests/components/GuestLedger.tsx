"use client";

import * as React from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

type GuestAction = (guest: GuestWithDetails) => void;

interface GuestLedgerProps {
  guests: GuestWithDetails[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onSelectGuest: GuestAction;
  onCopyLink: GuestAction;
  onShareWhatsApp: GuestAction;
}

const STATUS = {
  accepted: { label: "Attending", className: "text-success" },
  declined: { label: "Declined", className: "text-error" },
  pending: { label: "Awaiting reply", className: "text-gold-ink" },
} as const;

export function GuestLedger({
  guests,
  totalCount,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onSelectGuest,
  onCopyLink,
  onShareWhatsApp,
}: GuestLedgerProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-4">
      {isLoading || guests.length === 0 ? (
        <p className="py-10 text-on-surface-variant">
          {isLoading
            ? "Loading guests..."
            : "No guests found matching your criteria."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {guests.map((guest) => {
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
              <li
                key={guest.id}
                className="group flex items-center border-t border-outline-variant/70 first:border-t-0"
              >
                <button
                  type="button"
                  onClick={() => onSelectGuest(guest)}
                  className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-2 py-4 text-left transition-colors hover:bg-surface-container-low sm:grid-cols-[minmax(0,1fr)_5.5rem_8.5rem]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-lg font-medium leading-tight text-on-surface">
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
                    className={`inline-flex items-center gap-2 text-sm font-semibold sm:order-3 ${status.className}`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-current"
                    />
                    {status.label}
                  </span>
                  <span className="text-xs tabular-nums text-on-surface-variant sm:order-2 sm:text-sm">
                    {seats} {seats === 1 ? "seat" : "seats"}
                  </span>
                </button>

                <div className="hidden items-center gap-4 pr-2 text-xs font-semibold text-on-surface-variant opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 md:flex">
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
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant/70 pt-4 text-xs text-on-surface-variant sm:flex-row">
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
            className="h-8 px-2"
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
            className="h-8 px-2"
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

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
