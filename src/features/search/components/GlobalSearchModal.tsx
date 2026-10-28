"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { globalSearchAction } from "../actions";
import type { GlobalSearchResults } from "../types";
import { SearchResultsList } from "./SearchResultsList";

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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div
            className="fixed inset-0 bg-night/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 p-4 border-b border-outline-variant/30 bg-surface">
              <Icon name="search" className="text-lg text-wine shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search across all your celebrations, guests, vendors..."
                autoFocus
                className="w-full bg-transparent text-sm text-night outline-none placeholder:text-mist"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  className="text-mist hover:text-night text-xs p-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Results Container */}
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {isSearching ? (
                <div className="p-8 text-center text-xs text-mist flex items-center justify-center gap-2">
                  <Icon name="refresh" className="animate-spin text-base" />
                  <span>Searching events, guests, and tables...</span>
                </div>
              ) : !query.trim() ? (
                <div className="p-8 text-center text-xs text-mist">
                  Type at least 2 characters to search across celebrations,
                  guests, and vendors.
                </div>
              ) : !hasResults ? (
                <div className="p-8 text-center text-xs text-mist">
                  No matching results found for &ldquo;{query}&rdquo;.
                </div>
              ) : (
                <SearchResultsList
                  results={results!}
                  onSelect={() => setIsOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
