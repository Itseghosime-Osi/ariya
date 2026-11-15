import { LEGAL } from "@/lib/legal/site";

/** The word mark printed in the browser console, in the style a terminal prints a tool's name. */
export const CONSOLE_BANNER = [
  "    _         _                ",
  "   / \\   _ __(_)_   _  __ _    ",
  "  / _ \\ | '__| | | | |/ _` |   ",
  " / ___ \\| |  | | |_| | (_| |   ",
  "/_/   \\_\\_|  |_|\\__, |\\__,_|   ",
  "                |___/          ",
].join("\n");

/** Top to bottom: bright red to deep Àríyá wine-red. */
export const BANNER_REDS = [
  "#ff4d5e",
  "#f2384b",
  "#e0263a",
  "#c81b30",
  "#ab1428",
  "#8e1023",
];

export const CONSOLE_HELP = `💛 Something wrong? Email ${LEGAL.contactEmail} 💛`;

const KEY = "__ariyaGreeted";

/** Prints the greeting once per page load, however many layouts or re-renders ask for it. */
export function greetConsole(target: Window & { [KEY]?: boolean } = window) {
  if (target[KEY]) return false;
  target[KEY] = true;
  // Each line its own shade of red, bright at the top to deep at the bottom; readable on light and dark consoles.
  const lines = CONSOLE_BANNER.split("\n");
  console.log(
    lines.map((l) => `%c${l}`).join("\n"),
    ...lines.map(
      (_, i) =>
        `font-family: ui-monospace, Menlo, monospace; font-size: 12px; line-height: 1.15; font-weight: 700; color: ${BANNER_REDS[i % BANNER_REDS.length]};`
    )
  );
  console.log(
    `%c Àríyá · plan, invite, celebrate · ${LEGAL.site.replace("https://", "")} `,
    "font-family: ui-monospace, Menlo, monospace; color: #e0263a; font-weight: 600;"
  );
  console.log(
    `%c ${CONSOLE_HELP} `,
    "font-family: ui-monospace, Menlo, monospace; font-size: 13px; background: #1a0b10; color: #f3d9a6; padding: 10px 18px; border-radius: 6px;"
  );
  return true;
}
