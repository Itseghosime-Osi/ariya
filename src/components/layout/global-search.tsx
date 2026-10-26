"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";

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

  const navigateTo = (path: string) => {
    onOpenChange(false);
    setQuery("");
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guests, tables, vendors or actions..."
            className="w-full bg-transparent text-sm text-on-surface placeholder:text-mist focus:outline-none"
            autoFocus
          />
          <kbd className="rounded bg-surface-container px-2 py-0.5 text-[10px] text-on-surface-variant">
            ESC
          </kbd>
        </div>

        <div className="p-4 max-h-[380px] overflow-y-auto space-y-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
