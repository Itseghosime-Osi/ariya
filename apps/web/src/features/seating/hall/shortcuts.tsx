import React from "react";
import { cn } from "@/lib/utils";

/**
 * Key caps for a shortcut: each entry is one way to trigger it, written as the keys pressed
 * together. Keys pressed together are joined with "+", alternatives with "or".
 */
export function Keys({ keys, dark }: { keys: string[][]; dark?: boolean }) {
  const cap = dark
    ? "bg-white/15"
    : "border border-hairline bg-[#f7f4ef] text-night";
  const sep = dark ? "text-white/60" : "text-label-2";
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((combo, i) => (
        <React.Fragment key={combo.join("+")}>
          {i > 0 && <span className={cn("text-[10px]", sep)}>or</span>}
          {combo.map((k, j) => (
            <React.Fragment key={k}>
              {j > 0 && (
                <span className={cn("text-[11px] font-semibold", sep)}>+</span>
              )}
              <kbd
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded px-1 font-sans text-[11px] font-semibold",
                  cap
                )}
              >
                {k}
              </kbd>
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </span>
  );
}

export const SHORTCUTS = (
  mod: string
): { group: string; items: [string[][], string][] }[] => [
  {
    group: "Tools",
    items: [
      [[["V"], ["M"]], "Move and select"],
      [[["H"], ["D"]], "Drag the view"],
      [[["Space"]], "Hold to drag the view"],
      [[["A"]], "Auto layout"],
      [[["T"]], "Add a table"],
      [[["C"]], "Add chairs"],
      [[["S"]], "Stage, dance floor or area"],
      [[["P"]], "Décor palette"],
      [[["L"]], "Show table names"],
      [[["N"]], "Day or evening light"],
      [[["W"]], "Rain, at an open-air venue"],
    ],
  },
  {
    group: "Edit",
    items: [
      [[["R"]], "Rotate 15°"],
      [[["Shift", "R"]], "Rotate back 15°"],
      [[["Arrow keys"]], "Nudge 10 cm"],
      [[["Shift", "Arrow keys"]], "Nudge 1 m"],
      [[[mod, "D"]], "Duplicate"],
      [[[mod, "Click"]], "Copy what you click"],
      [[["Del"]], "Delete"],
      [[[mod, "Z"]], "Undo"],
      [
        [
          [mod, "Shift", "Z"],
          [mod, "Y"],
        ],
        "Redo",
      ],
      [[["Esc"]], "Clear selection or close"],
    ],
  },
  {
    group: "View",
    items: [
      [[["F"], ["0"]], "Fit the hall"],
      [[["+"]], "Zoom in"],
      [[["−"]], "Zoom out"],
      [[["\\"]], "Hide or show the side panel"],
      [[["?"]], "This list"],
    ],
  },
];
