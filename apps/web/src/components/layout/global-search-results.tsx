import React from "react";
import type { GlobalSearchResults } from "@/features/search/types";

interface GlobalSearchResultsListProps {
  results: GlobalSearchResults;
  query: string;
  onNavigate: (path: string) => void;
}

export function GlobalSearchResultsList({
  results,
  query,
  onNavigate,
}: GlobalSearchResultsListProps) {
  if (
    results.events.length === 0 &&
    results.guests.length === 0 &&
    results.vendors.length === 0
  ) {
    return (
      <div className="py-6 text-center text-xs text-mist">
        No celebrations, guests, or vendors matching &ldquo;{query}&rdquo;
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.events.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-wine px-2">
            Events ({results.events.length})
          </div>
          {results.events.map((evt) => (
            <button
              key={evt.id}
              onClick={() => onNavigate(`/events/${evt.id}`)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container text-left text-xs transition-colors"
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
                onNavigate(
                  `/events/${gst.event_id}/guests?search=${encodeURIComponent(gst.name)}`
                )
              }
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container text-left text-xs transition-colors"
            >
              <div>
                <div className="font-semibold text-night">{gst.name}</div>
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
              onClick={() => onNavigate(`/events/${vnd.event_id}/vendors`)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container text-left text-xs transition-colors"
            >
              <div>
                <div className="font-semibold text-night">{vnd.name}</div>
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
  );
}
