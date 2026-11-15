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

export const CONSOLE_HELP = `💛 Something wrong? Email ${LEGAL.contactEmail} 💛`;

const KEY = "__ariyaGreeted";

/** Prints the greeting once per page load, however many layouts or re-renders ask for it. */
export function greetConsole(target: Window & { [KEY]?: boolean } = window) {
  if (target[KEY]) return false;
  target[KEY] = true;
  console.log(
    `%c${CONSOLE_BANNER}`,
    "font-family: ui-monospace, Menlo, monospace; font-size: 12px; line-height: 1.15; color: #c9a465; font-weight: 700;"
  );
  console.log(
    `%c Àríyá · plan, invite, celebrate · ${LEGAL.site.replace("https://", "")} `,
    "font-family: ui-monospace, Menlo, monospace; color: #7a1f2b; font-weight: 600;"
  );
  console.log(
    `%c ${CONSOLE_HELP} `,
    "font-family: ui-monospace, Menlo, monospace; font-size: 13px; background: #1a0b10; color: #f3d9a6; padding: 10px 18px; border-radius: 6px;"
  );
  return true;
}
