"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { TableWithGuests } from "../types";

interface PrintableSeatingChartProps {
  eventId: string;
  eventTitle: string;
  couple: string;
  date: string;
  tables: TableWithGuests[];
}

export function PrintableSeatingChart({
  eventId,
  eventTitle,
  couple,
  date,
  tables,
}: PrintableSeatingChartProps) {
  const [activeTab, setActiveTab] = useState<"chart" | "cards">("chart");

  return (
    <div className="min-h-screen bg-surface p-6 sm:p-10 text-night print:p-0 print:bg-white">
      {/* Top Controls Bar (hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-outline-variant/40 shadow-xs print:hidden">
        <div>
          <Link
            href={`/events/${eventId}/seating`}
            className="text-xs text-wine hover:underline flex items-center gap-1 font-semibold mb-1"
          >
            <Icon name="arrow_back" className="text-sm" />
            <span>Return to Seating Desk</span>
          </Link>
          <h1 className="font-serif text-xl text-wine font-medium">
            Ceremonial Seating Dossier & Place Cards
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-surface-container-high p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("chart")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "chart"
                  ? "bg-white text-wine shadow-xs"
                  : "text-on-surface-variant hover:text-wine"
              }`}
            >
              Seating Chart
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "cards"
                  ? "bg-white text-wine shadow-xs"
                  : "text-on-surface-variant hover:text-wine"
              }`}
            >
              Place Cards (V2 23)
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-wine hover:bg-wine/90 text-ivory text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Icon name="print" className="text-sm" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Main Print Container */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-outline-variant/30 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Ceremonial Header */}
        <div className="text-center pb-6 border-b border-wine/20 space-y-1.5">
          <span className="text-[10px] font-bold tracking-widest text-wine/80 uppercase">
            Àríyá Ceremonial Seating Register
          </span>
          <h2 className="font-serif text-3xl text-wine font-medium">
            {eventTitle}
          </h2>
          <p className="font-serif text-base italic text-wine/80">
            Nuptials of {couple} • {date}
          </p>
        </div>

        {/* Tab 1: Seating Chart Table Roster */}
        {activeTab === "chart" && (
          <div className="pt-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="border border-outline-variant/30 rounded-xl p-4 bg-surface-container-lowest print:bg-white break-inside-avoid space-y-3"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-wine/10">
                    <h3 className="font-serif text-base text-wine font-semibold">
                      {table.name}
                    </h3>
                    <span className="text-[11px] text-wine/80 font-mono">
                      {table.occupiedSeats}/{table.capacity} Seats
                    </span>
                  </div>

                  {table.guests.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic py-2">
                      Table currently unassigned.
                    </p>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-night">
                      {table.guests.map((g) => (
                        <li key={g.id} className="truncate">
                          <span className="font-medium">{g.name}</span>
                          {g.attending_count > 1 && (
                            <span className="text-wine/70 text-[10px] ml-1">
                              (+{g.attending_count - 1} party)
                            </span>
                          )}
                          {g.dietary && (
                            <span className="text-amber-800 text-[10px] italic ml-1">
                              [{g.dietary}]
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Place Cards Layout (Grid of fold cards for tables) */}
        {activeTab === "cards" && (
          <div className="pt-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
              {tables.flatMap((table) =>
                table.guests.map((guest) => (
                  <div
                    key={`${table.id}-${guest.id}`}
                    className="border border-wine/30 rounded-xl p-4 bg-white text-center flex flex-col justify-between h-40 break-inside-avoid shadow-xs print:shadow-none"
                  >
                    <div className="text-[9px] uppercase tracking-wider text-wine/70 font-semibold border-b border-wine/10 pb-1">
                      {couple}
                    </div>

                    <div className="my-auto space-y-1">
                      <p className="font-serif text-base font-semibold text-wine leading-tight">
                        {guest.name}
                      </p>
                      {guest.is_vip && (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                          VIP
                        </span>
                      )}
                      {guest.dietary && (
                        <p className="text-[9px] text-amber-800 italic">
                          Dietary: {guest.dietary}
                        </p>
                      )}
                    </div>

                    <div className="pt-1 border-t border-wine/10 flex justify-between items-center text-[10px] text-wine/80">
                      <span className="font-medium">{table.name}</span>
                      <span className="font-mono text-[9px]">
                        Party of {guest.attending_count}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
