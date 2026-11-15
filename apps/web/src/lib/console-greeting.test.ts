import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_BANNER, CONSOLE_HELP, greetConsole } from "./console-greeting";

afterEach(() => vi.restoreAllMocks());

describe("console greeting", () => {
  it("prints the word mark and the help address once per page load", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const win = {} as Window;
    expect(greetConsole(win)).toBe(true);
    expect(greetConsole(win)).toBe(false);
    expect(log).toHaveBeenCalledTimes(3);
    expect(log.mock.calls[0][0].replaceAll("%c", "")).toBe(CONSOLE_BANNER);
    // One red per line of the word mark.
    expect(
      log.mock.calls[0]
        .slice(1)
        .every((css: string) => /color: #[0-9a-f]{6}/.test(css))
    ).toBe(true);
    expect(log.mock.calls[2][0]).toContain("help@ariyaday.com");
  });

  it("keeps every line of the banner the same width", () => {
    const widths = new Set(CONSOLE_BANNER.split("\n").map((l) => l.length));
    expect(widths.size).toBe(1);
    expect(CONSOLE_HELP).not.toMatch(/prototype/i);
  });
});
