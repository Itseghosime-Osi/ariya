"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { globalSearchAction } from "@/features/search/actions";
import type { GlobalSearchResults } from "@/features/search/types";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
}

export function GlobalSearch({
  open,
  onOpenChange,
  eventId,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

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

  const navigateTo = (path: string) => {
    onOpenChange(false);
    setQuery("");
    setResults(null);
    router.push(path);
  };

  const quickLinks = [
    {
      label: "Guest Registry",
      path: eventId ? `/events/${eventId}/guests` : "/events",
      icon: "menu_book",
    },
    {
      label: "Seating Plan",
      path: eventId ? `/events/${eventId}/seating` : "/events",
      icon: "table_restaurant",
    },
    {
      label: "Invitation Atelier",
      path: eventId ? `/events/${eventId}/invitations` : "/events",
      icon: "styler",
    },
    {
      label: "Check-in Desk",
      path: eventId ? `/events/${eventId}/check-in` : "/events",
      icon: "qr_code_scanner",
    },
    {
      label: "Vendors & Tasks",
      path: eventId ? `/events/${eventId}/vendors` : "/events",
      icon: "restaurant_menu",
    },
    {
      label: "Billing & Receipts",
      path: eventId ? `/events/${eventId}/billing` : "/events",
      icon: "credit_card",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-surface-container-lowest">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Celebration</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b border-outline-variant/20 px-4 py-3 bg-surface-container-low">
          <Icon name="search" size={20} className="text-primary mr-3" />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search events, guests, vendors..."
            className="w-full bg-transparent text-sm text-on-surface placeholder:text-mist focus:outline-none"
            autoFocus
          />
          <kbd className="rounded bg-surface-container px-2 py-0.5 text-[10px] text-on-surface-variant">
            ESC
          </kbd>
        </div>

        <div className="p-4 max-h-[380px] overflow-y-auto space-y-4">
          {isSearching && (
            <div className="py-6 text-center text-xs text-mist flex items-center justify-center gap-2">
              <Icon
                name="progress_activity"
                className="animate-spin text-base"
              />
              <span>Searching registry dossiers...</span>
            </div>
          )}

          {!isSearching && query.trim() && results && (
            <div className="space-y-4">
              {results.events.length === 0 &&
                results.guests.length === 0 &&
                results.vendors.length === 0 && (
                  <div className="py-6 text-center text-xs text-mist">
                    No celebrations, guests, or vendors matching &ldquo;{query}
                    &rdquo;
                  </div>
                )}

              {results.events.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-wine px-2">
                    Events ({results.events.length})
                  </div>
                  {results.events.map((evt) => (
                    <button
                      key={evt.id}
                      onClick={() => navigateTo(`/events/${evt.id}`)}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container text-left text-xs transition-colors"
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
                    </button>
                  ))}
                </div>
              )}

              {results.guests.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-wine px-2">
                    Guests ({results.guests.length})
                  </div>
                  {results.guests.map((gst) => (
                    <button
                      key={gst.id}
                      onClick={() =>
                        navigateTo(
                          `/events/${gst.event_id}/guests?search=${encodeURIComponent(gst.name)}`
                        )
                      }
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container text-left text-xs transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-night">
                          {gst.name}
                        </div>
                        <div className="text-[11px] text-mist">
                          {gst.email || gst.phone || "No contact"} • Event:{" "}
                          {gst.event_title}
                        </div>
                      </div>
                      {gst.group_name && (
                        <span className="text-[10px] text-stone-600 px-2 py-0.5 rounded bg-stone-100">
                          {gst.group_name}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {results.vendors.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-wine px-2">
                    Vendors ({results.vendors.length})
                  </div>
                  {results.vendors.map((vnd) => (
                    <button
                      key={vnd.id}
                      onClick={() =>
                        navigateTo(`/events/${vnd.event_id}/vendors`)
                      }
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container text-left text-xs transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-night">
                          {vnd.name}
                        </div>
                        <div className="text-[11px] text-mist">
                          {vnd.category} • Event: {vnd.event_title}
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-700 px-2 py-0.5 rounded bg-emerald-50">
                        {vnd.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!query.trim() && (
            <div>
              <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 px-2">
                Quick Navigation
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => navigateTo(link.path)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-surface-container text-left text-sm text-on-surface transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-wine">
                      <Icon name={link.icon} size={16} />
                    </div>
                    <span className="font-medium text-xs sm:text-sm">
                      {link.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
