import React from "react";
import Link from "next/link";
import type { GlobalSearchResults } from "../types";

interface SearchResultsListProps {
  results: GlobalSearchResults;
  onSelect: () => void;
}

export function SearchResultsList({
  results,
  onSelect,
}: SearchResultsListProps) {
  return (
    <div className="space-y-4">
      {results.events.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-wine px-2">
            Events ({results.events.length})
          </div>
          {results.events.map((evt) => (
            <Link
              key={evt.id}
              href={`/events/${evt.id}`}
              onClick={onSelect}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container text-xs transition-colors"
            >
              <div>
                <div className="font-semibold text-night">{evt.title}</div>
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
              onClick={onSelect}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container text-xs transition-colors"
            >
              <div>
                <div className="font-semibold text-night">{gst.name}</div>
                <div className="text-[11px] text-mist">
                  {gst.email || gst.phone || "No direct contact"} • Event:{" "}
                  {gst.event_title}
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
              onClick={onSelect}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container text-xs transition-colors"
            >
              <div>
                <div className="font-semibold text-night">{vnd.name}</div>
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
  );
}
