"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { globalSearchAction } from "../actions";
import type { GlobalSearchResults } from "../types";

export function GlobalSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, startTransition] = useTransition();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults(null);
      return;
    }
    startTransition(async () => {
      const res = await globalSearchAction(val);
      if (res.data) {
        setResults(res.data);
      }
    });
  };

  const hasResults =
    results &&
    (results.events.length > 0 ||
      results.guests.length > 0 ||
      results.vendors.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search celebration registry (Cmd+K)"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface text-mist hover:text-night text-xs transition-colors shadow-2xs"
      >
        <Icon name="search" className="text-sm" />
        <span className="hidden sm:inline">Search celebration suite...</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded-md bg-stone-100 border border-stone-300 text-stone-600">
          ⌘K
        </kbd>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-night/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-surface-container-lowest border border-outline-variant/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-outline-variant/40 flex items-center gap-3">
              <Icon name="search" className="text-xl text-wine shrink-0" />
              <input
                type="text"
                value={query}
                autoFocus
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search events, guests, vendors..."
                className="w-full text-sm bg-transparent outline-none text-night placeholder:text-mist"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close search"
                className="p-1 rounded-lg text-mist hover:text-night"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4 flex-1">
              {isSearching && (
                <div className="py-6 text-center text-xs text-mist flex items-center justify-center gap-2">
                  <Icon
                    name="progress_activity"
                    className="animate-spin text-base"
                  />
                  <span>Searching celebration dossiers...</span>
                </div>
              )}

              {!isSearching && query.trim() && !hasResults && (
                <div className="py-8 text-center text-xs text-mist">
                  No matching events, guests, or vendors found.
                </div>
              )}

              {results && (
                <div className="space-y-4">
                  {results.events.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-wine px-2">
                        Celebration Events ({results.events.length})
                      </div>
                      {results.events.map((evt) => (
                        <Link
                          key={evt.id}
                          href={`/events/${evt.id}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container text-xs transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-night">
                              {evt.title}
                            </div>
                            <div className="text-[11px] text-mist">
                              {evt.couple} • {evt.venue}
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-wine px-2 py-0.5 rounded-md bg-wine/10">
                            {evt.user_role}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {results.guests.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-wine px-2">
                        Guests ({results.guests.length})
                      </div>
                      {results.guests.map((gst) => (
                        <Link
                          key={gst.id}
                          href={`/events/${gst.event_id}/guests?search=${encodeURIComponent(gst.name)}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container text-xs transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-night">
                              {gst.name}
                            </div>
                            <div className="text-[11px] text-mist">
                              {gst.email || gst.phone || "No direct contact"} •
                              Event: {gst.event_title}
                            </div>
                          </div>
                          {gst.group_name && (
                            <span className="text-[10px] text-stone-600 px-2 py-0.5 rounded-md bg-stone-100">
                              {gst.group_name}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}

                  {results.vendors.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-wine px-2">
                        Vendors ({results.vendors.length})
                      </div>
                      {results.vendors.map((vnd) => (
                        <Link
                          key={vnd.id}
                          href={`/events/${vnd.event_id}/vendors`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container text-xs transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-night">
                              {vnd.name}
                            </div>
                            <div className="text-[11px] text-mist">
                              {vnd.category} • Event: {vnd.event_title}
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-50">
                            {vnd.status}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
