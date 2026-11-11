"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { MenuGroup } from "./StudioMenuBar";

interface Command {
  group: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  run: () => void;
}

/** One search box for every menu action (D4). Built from the same menus, so it never drifts. */
export function CommandPalette({
  open,
  onClose,
  menus,
  dark = false,
}: {
  open: boolean;
  onClose: () => void;
  menus: MenuGroup[];
  dark?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(
    () =>
      menus.flatMap((group) =>
        group.items.flatMap((item) =>
          item === "separator"
            ? []
            : [
                {
                  group: group.title,
                  label: item.label.replace(/…$/, ""),
                  shortcut: item.shortcut,
                  disabled: item.disabled,
                  run: item.onClick,
                },
              ]
        )
      ),
    [menus]
  );

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return commands.filter((c) => {
      const hay = `${c.group} ${c.label}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [commands, query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const choose = (c: Command | undefined) => {
    if (!c || c.disabled) return;
    onClose();
    // Let the dialog release focus first so the action starts from the studio.
    window.setTimeout(c.run, 0);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          data-testid="command-palette"
          className={`fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm ${dark ? "dark" : ""}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-black/10 bg-ivory shadow-2xl dark:border-white/10 dark:bg-[#1a1118] dark:text-ivory">
            <Dialog.Title className="sr-only">Find a command</Dialog.Title>
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls="command-list"
              aria-activedescendant={
                results[index] ? `command-${index}` : undefined
              }
              aria-label="Find a command"
              placeholder="Find a command, like export or align"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setIndex((i) => Math.min(results.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setIndex((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  choose(results[index]);
                }
              }}
              className="h-12 w-full border-b border-black/10 bg-transparent px-4 text-sm outline-none dark:border-white/10"
            />
            <ul
              id="command-list"
              ref={listRef}
              role="listbox"
              className="max-h-[50vh] overflow-y-auto py-1"
            >
              {results.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-label-2">
                  Nothing matches “{query}”. Try a shorter word.
                </li>
              )}
              {results.map((c, i) => (
                <li
                  key={`${c.group}-${c.label}`}
                  id={`command-${i}`}
                  role="option"
                  aria-selected={i === index}
                  aria-disabled={c.disabled || undefined}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => choose(c)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm ${
                    i === index ? "bg-burgundy/10" : ""
                  } ${c.disabled ? "opacity-40" : ""}`}
                >
                  <span>
                    <span className="mr-2 text-xs uppercase tracking-wide text-label-2">
                      {c.group}
                    </span>
                    {c.label}
                  </span>
                  {c.shortcut && (
                    <span className="font-mono text-xs text-label-2">
                      {c.shortcut.replaceAll("Cmd", "⌘/Ctrl")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
