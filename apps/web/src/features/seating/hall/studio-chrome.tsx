"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ItemGroup } from "./model";
import { Keys, SHORTCUTS } from "./shortcuts";

/**
 * Grouping, above whatever is selected: name a set of items so it moves as one, rename it, or
 * take it apart. A group is a way of holding things together, not a copy of them.
 */
export function GroupBar({
  count,
  group,
  onGroup,
  onRename,
  onUngroup,
}: {
  count: number;
  group: ItemGroup | null;
  onGroup: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onUngroup: (id: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => {
    setName(group?.name ?? "");
    setEditing(false);
  }, [group?.id, group?.name]);

  return (
    <div className="border-b border-hairline bg-[#faf7f2] px-4 py-2.5">
      {group ? (
        <div className="flex items-center gap-2">
          {editing ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                onRename(group.id, name);
                setEditing(false);
              }}
            >
              <input
                autoFocus
                value={name}
                aria-label="Group name"
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                className="h-9 min-w-0 flex-1 rounded-lg border border-hairline bg-white px-2 text-sm text-night outline-none focus:border-night"
              />
              <button
                type="submit"
                className="min-h-9 rounded-full bg-burgundy px-3 text-xs font-semibold text-ivory"
              >
                Save
              </button>
            </form>
          ) : (
            <>
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-night">
                {group.name}
                <span className="ml-1.5 font-normal text-label-2">
                  {group.items.length} items
                </span>
              </p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="min-h-9 rounded-full px-3 text-xs font-semibold text-burgundy hover:bg-burgundy/10"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => onUngroup(group.id)}
                className="min-h-9 rounded-full px-3 text-xs font-semibold text-label-2 hover:bg-black/5"
              >
                Ungroup
              </button>
            </>
          )}
        </div>
      ) : count > 1 ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            onGroup(name);
            setName("");
          }}
        >
          <input
            value={name}
            aria-label="Name this group"
            placeholder="Name this group"
            onChange={(e) => setName(e.target.value.slice(0, 60))}
            className="h-9 min-w-0 flex-1 rounded-lg border border-hairline bg-white px-2 text-sm text-night outline-none focus:border-night"
          />
          <button
            type="submit"
            className="min-h-9 shrink-0 rounded-full bg-burgundy px-3 text-xs font-semibold text-ivory hover:bg-wine"
          >
            Group {count}
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-label-2">
          Select two or more items to group them, so they move together.
        </p>
      )}
    </div>
  );
}

/** Simple mode on one side, the full studio on the other, over the same document (7.2). */
export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: "simple" | "studio";
  onChange: (m: "simple" | "studio") => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="How much detail to show"
      // Each button keeps a 44 px target for a finger; on a laptop only the pill drawn inside it
      // is button-sized, so the switch reads like ordinary buttons in the top bar.
      className="inline-flex rounded-full border border-hairline bg-white p-0.5 shadow-2xs lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
    >
      {(
        [
          ["simple", "Simple"],
          ["studio", "Full studio"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={mode === key}
          onClick={() => onChange(key)}
          className={cn(
            "group min-h-11 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
            "lg:inline-flex lg:items-center lg:px-0.5",
            mode === key
              ? "bg-burgundy text-ivory shadow-xs lg:bg-transparent lg:shadow-none"
              : "text-label-2 hover:bg-burgundy/10 hover:text-night lg:hover:bg-transparent"
          )}
        >
          <span
            className={cn(
              "lg:block lg:rounded-full lg:px-3.5 lg:py-1.5",
              mode === key
                ? "lg:bg-burgundy lg:text-ivory"
                : "lg:bg-[#f1ece4] lg:group-hover:bg-burgundy/10"
            )}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

/** The hover label beside a rail button, with its letter keys. */
export function RailTip({ label, keys }: { label: string; keys: string[] }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 flex -translate-y-1/2 -translate-x-1 items-center gap-2 whitespace-nowrap rounded-lg bg-night px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition duration-150 group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-visible/rail:translate-x-0 group-focus-visible/rail:opacity-100 motion-reduce:transition-none"
    >
      {label}
      <Keys keys={keys.map((k) => [k])} dark />
    </span>
  );
}

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  // The sheet only opens after a click or key press, so reading the platform here is safe.
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      className="pointer-events-auto absolute left-[4.25rem] top-[80px] z-30 max-h-[calc(100%-6rem)] w-[min(340px,calc(100%-6rem))] overflow-y-auto rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_20px_50px_-20px_rgba(28,7,13,0.45)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-label-2">
          Keyboard shortcuts
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-7 w-7 place-items-center rounded-full text-label-2 hover:bg-[#f1ece4]"
        >
          <X size={14} />
        </button>
      </div>
      {SHORTCUTS(mac ? "⌘" : "Ctrl").map(({ group, items }) => (
        <div key={group} className="mb-3 last:mb-0">
          <p className="mb-1 text-xs font-semibold text-night">{group}</p>
          <ul className="space-y-1">
            {items.map(([keys, what]) => (
              <li
                key={what}
                className="flex items-center justify-between gap-3 text-xs text-label-2"
              >
                <span>{what}</span>
                <Keys keys={keys} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
