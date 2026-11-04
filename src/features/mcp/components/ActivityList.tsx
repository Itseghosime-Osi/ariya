import type { ActivityEntry } from "@/features/approvals/types";

// Fixed locale and zone so the server and client render the same string.
const DATE = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

/** Phrased as the app's own request, because that is what the row records. */
const TOOL_LABEL: Record<string, string> = {
  propose_send_invitations: "Asked to send invitations",
  propose_send_reminders: "Asked to send reminders",
  list_my_proposals: "Checked its own requests",
};

const OUTCOME_LABEL: Record<ActivityEntry["outcome"], string> = {
  ok: "Done",
  denied: "Refused",
  error: "Failed",
};

const OUTCOME_TONE: Record<ActivityEntry["outcome"], string> = {
  ok: "text-gold-ink",
  denied: "text-wine",
  error: "text-wine",
};

export function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[22px] border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm text-on-surface-variant">
        Nothing yet. Once an app reads or changes something, it is listed here —
        refusals included.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-hairline">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 py-3.5"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-surface">
              {TOOL_LABEL[entry.tool] ?? humanise(entry.tool)}
            </p>
            {entry.eventTitle || entry.note ? (
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {[entry.eventTitle, entry.note].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
                OUTCOME_TONE[entry.outcome]
              }`}
            >
              {OUTCOME_LABEL[entry.outcome]}
            </span>
            <span className="text-xs text-on-surface-variant">
              {DATE.format(new Date(entry.createdAt))}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A tool the page has not learned yet still reads as a sentence rather than an identifier. */
function humanise(tool: string): string {
  const words = tool.replace(/_/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : tool;
}
