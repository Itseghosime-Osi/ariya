"use client";
import React, { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
export interface MenuAction {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}
export interface MenuGroup {
  title: string;
  items: Array<MenuAction | "separator">;
}
/** Menu focus, keyboard traversal, outside clicks and Escape use the shared UI primitives. */
export function StudioMenuBar({
  menus,
  dark,
}: {
  menus: MenuGroup[];
  dark: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <nav
      aria-label="Studio menus"
      className="flex items-center gap-0.5 text-xs"
    >
      {menus.map((menu) => (
        <DropdownMenu.Root
          key={menu.title}
          open={open === menu.title}
          onOpenChange={(value) => setOpen(value ? menu.title : null)}
        >
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onMouseEnter={() => {
                if (open) setOpen(menu.title);
              }}
              className={cn(
                "min-h-8 rounded-lg px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-gold",
                dark
                  ? "text-ivory hover:bg-white/10 data-[state=open]:bg-white/10"
                  : "text-night hover:bg-burgundy/10 data-[state=open]:bg-burgundy/10"
              )}
            >
              {menu.title}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              aria-label={`${menu.title} menu`}
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className={cn(
                "z-[100] min-w-56 max-h-[70dvh] overflow-auto rounded-2xl border p-1.5 shadow-xl",
                dark
                  ? "border-white/15 bg-[#23181e] text-[#fff6dc]"
                  : "border-hairline bg-ivory text-night"
              )}
            >
              {menu.items.map((item, index) =>
                item === "separator" ? (
                  <DropdownMenu.Separator
                    key={index}
                    className="my-1 h-px bg-current opacity-10"
                  />
                ) : (
                  <DropdownMenu.Item
                    key={item.label}
                    disabled={item.disabled}
                    onSelect={item.onClick}
                    className={cn(
                      "flex min-h-9 cursor-default select-none items-center justify-between gap-6 rounded-lg px-3 py-2 text-xs outline-none data-[disabled]:opacity-35 data-[highlighted]:bg-burgundy/10",
                      item.danger && "text-red-600"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon}
                      {item.label}
                    </span>
                    {item.shortcut && (
                      <kbd className="text-[10px] opacity-65">
                        {item.shortcut.replaceAll("Cmd", "⌘ / Ctrl")}
                      </kbd>
                    )}
                  </DropdownMenu.Item>
                )
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ))}
    </nav>
  );
}
