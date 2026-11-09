"use client";

import React, { useState, useRef, useEffect } from "react";
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

export function StudioMenuBar({
  menus,
  dark,
}: {
  menus: MenuGroup[];
  dark: boolean;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center gap-0.5 text-xs select-none",
        dark ? "text-zinc-200" : "text-[#3b2b31]"
      )}
    >
      {menus.map((menu) => {
        const isOpen = openMenu === menu.title;
        return (
          <div key={menu.title} className="relative">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={isOpen}
              onClick={() => setOpenMenu(isOpen ? null : menu.title)}
              onMouseEnter={() => {
                if (openMenu !== null && openMenu !== menu.title) {
                  setOpenMenu(menu.title);
                }
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                isOpen
                  ? dark
                    ? "bg-white/15 text-white"
                    : "bg-[#4a0e17]/10 text-[#4a0e17] font-semibold"
                  : dark
                    ? "hover:bg-white/10 hover:text-white"
                    : "hover:bg-[#4a0e17]/5 hover:text-[#4a0e17]"
              )}
            >
              {menu.title}
            </button>

            {isOpen && (
              <div
                role="menu"
                className={cn(
                  "absolute left-0 top-full mt-1 min-w-[200px] rounded-xl border p-1 shadow-2xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-100",
                  dark
                    ? "border-[#3f2935] bg-[#23181e]/95 text-zinc-200 shadow-black/60"
                    : "border-[#e6ded2] bg-[#ffffff]/95 text-[#2d1f24] shadow-black/10"
                )}
              >
                {menu.items.map((item, idx) => {
                  if (item === "separator") {
                    return (
                      <div
                        key={`sep-${idx}`}
                        className={cn(
                          "my-1 h-px",
                          dark ? "bg-white/10" : "bg-black/10"
                        )}
                      />
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => {
                        item.onClick();
                        setOpenMenu(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-35",
                        item.danger
                          ? "text-red-500 hover:bg-red-500/10"
                          : dark
                            ? "hover:bg-white/10 hover:text-white"
                            : "hover:bg-[#4a0e17]/10 hover:text-[#4a0e17]"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      {item.shortcut && (
                        <span
                          className={cn(
                            "font-mono text-[10px]",
                            dark ? "text-zinc-500" : "text-zinc-400"
                          )}
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
