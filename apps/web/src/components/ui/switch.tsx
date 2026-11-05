import * as React from "react";
import { cn } from "@/lib/utils";

/** A pill toggle in the house burgundy. Announced as a switch, so the label is what a reader hears. */
export function Switch({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-[30px] w-[52px] shrink-0 items-center rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-50",
        on
          ? "bg-gradient-to-r from-[#8a1c36] to-[#b0485f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]"
          : "bg-[#e3d9cf]"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-[24px] w-[24px] rounded-full bg-white shadow-[0_2px_6px_rgba(28,7,13,0.3)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
          on ? "translate-x-[25px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}
