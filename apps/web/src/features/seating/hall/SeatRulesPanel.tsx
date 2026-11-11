"use client";

import { useMemo, useState } from "react";
import { Link2, Trash2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section } from "./studio-ui";
import {
  MAX_RULE_GUESTS,
  MAX_RULES,
  newRuleId,
  type RuleBreak,
  type SeatRule,
  type SeatRuleKind,
} from "./rules";

export interface RuleGuest {
  id: string;
  name: string;
}

/**
 * Keep-together and keep-apart rules: a family split over several invitations sits at one table;
 * relatives who must not meet never share one. Auto-seat follows the rules, and any rule the
 * current seating breaks is listed here in plain words.
 */
export function SeatRulesPanel({
  rules,
  guests,
  breaks,
  onAdd,
  onRemove,
}: {
  rules: SeatRule[];
  guests: RuleGuest[];
  breaks: RuleBreak[];
  onAdd: (rule: SeatRule) => void;
  onRemove: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<SeatRuleKind>("together");
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const nameOf = useMemo(
    () => new Map(guests.map((g) => [g.id, g.name])),
    [guests]
  );
  const shown = guests
    .filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 60);
  const broken = new Set(breaks.map((b) => b.rule.id));

  const reset = () => {
    setAdding(false);
    setPicked([]);
    setQ("");
    setKind("together");
  };

  return (
    <Section
      title="Seating rules"
      aside={
        <span className="text-[11px] text-label-2">
          {rules.length} {rules.length === 1 ? "rule" : "rules"}
        </span>
      }
    >
      <p className="text-xs text-label-2">
        Seat everyone follows these. Keep families who were invited separately
        together, and keep apart anyone who must not share a table.
      </p>

      {breaks.length > 0 && (
        <ul
          role="alert"
          className="mt-2 space-y-1 rounded-xl bg-[#fbeeee] p-3 text-xs text-[#7a1f20]"
        >
          {breaks.slice(0, 5).map((b, i) => (
            <li key={`${b.rule.id}-${i}`}>{b.reason}</li>
          ))}
          {breaks.length > 5 && <li>and {breaks.length - 5} more.</li>}
        </ul>
      )}

      {rules.length > 0 && (
        <ul className="mt-2 space-y-1.5" data-testid="seat-rules">
          {rules.map((r) => (
            <li
              key={r.id}
              className={cn(
                "flex items-start gap-2 rounded-xl border bg-white p-2 text-xs",
                broken.has(r.id) ? "border-[#9e2a2b]/40" : "border-hairline"
              )}
            >
              {r.kind === "together" ? (
                <Link2
                  size={14}
                  className="mt-0.5 shrink-0 text-[#2e6a4f]"
                  aria-hidden="true"
                />
              ) : (
                <Unlink
                  size={14}
                  className="mt-0.5 shrink-0 text-[#9e2a2b]"
                  aria-hidden="true"
                />
              )}
              <p className="min-w-0 flex-1 text-night">
                <strong className="font-semibold">
                  {r.kind === "together" ? "Together: " : "Apart: "}
                </strong>
                {r.guestIds
                  .map((id) => nameOf.get(id) ?? "A removed guest")
                  .join(", ")}
              </p>
              <button
                type="button"
                onClick={() => onRemove(r.id)}
                aria-label={`Remove the rule for ${r.guestIds
                  .map((id) => nameOf.get(id) ?? "a removed guest")
                  .join(", ")}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-label-2 hover:bg-ivory hover:text-night focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!adding ? (
        <button
          type="button"
          disabled={rules.length >= MAX_RULES || guests.length < 2}
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night hover:bg-ivory disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-burgundy"
        >
          Add a rule
        </button>
      ) : (
        <div className="mt-3 rounded-xl border border-hairline bg-white p-3">
          <div
            role="radiogroup"
            aria-label="Kind of rule"
            className="flex gap-1"
          >
            {(
              [
                ["together", "Keep together"],
                ["apart", "Keep apart"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className="min-h-11 flex-1 rounded-full border border-hairline px-3 text-xs font-semibold text-night aria-checked:border-night aria-checked:bg-night aria-checked:text-white focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                {label}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-[11px] font-semibold text-label-2">
            Find guests
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type a name"
              className="mt-1 h-11 w-full rounded-lg border border-hairline px-3 text-base text-night outline-none focus:border-night sm:text-sm"
            />
          </label>
          <fieldset className="mt-2">
            <legend className="sr-only">Guests in this rule</legend>
            <ul className="max-h-48 space-y-0.5 overflow-y-auto">
              {shown.map((g) => {
                const on = picked.includes(g.id);
                return (
                  <li key={g.id}>
                    <label className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm text-night hover:bg-ivory">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!on && picked.length >= MAX_RULE_GUESTS}
                        onChange={() =>
                          setPicked((p) =>
                            on ? p.filter((x) => x !== g.id) : [...p, g.id]
                          )
                        }
                        className="h-4 w-4 accent-[#6b1e2e]"
                      />
                      {g.name}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-label-2">{picked.length} chosen</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="min-h-11 rounded-full px-4 text-xs font-semibold text-night hover:bg-ivory focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={picked.length < 2}
                onClick={() => {
                  onAdd({ id: newRuleId(), kind, guestIds: picked });
                  reset();
                }}
                className="min-h-11 rounded-full bg-night px-4 text-xs font-semibold text-white hover:bg-burgundy disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                Save rule
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
