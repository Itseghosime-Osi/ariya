import { describe, it, expect, vi, afterEach } from "vitest";
import { isAllowedOrigin } from "./origin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAllowedOrigin", () => {
  it("lets a request with no Origin through, because it is not a browser", () => {
    expect(isAllowedOrigin(null)).toBe(true);
  });

  it("allows the hosted MCP clients", () => {
    expect(isAllowedOrigin("https://claude.ai")).toBe(true);
    expect(isAllowedOrigin("https://chatgpt.com")).toBe(true);
  });

  it("normalises a trailing slash and letter case before matching", () => {
    expect(isAllowedOrigin("https://claude.ai/")).toBe(true);
    expect(isAllowedOrigin("https://CLAUDE.AI")).toBe(true);
  });

  it("allows local clients on any port, over http or https", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("http://localhost:6274")).toBe(true);
    expect(isAllowedOrigin("https://localhost")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:57321")).toBe(true);
    expect(isAllowedOrigin("http://[::1]:3000")).toBe(true);
  });

  it("allows the app's own origin, whatever path it arrives with", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ariya.example");

    expect(isAllowedOrigin("https://ariya.example")).toBe(true);
    expect(isAllowedOrigin("https://ariya.example/connect-ai")).toBe(true);
  });

  it("refuses an origin that only looks like an allowed one", () => {
    expect(isAllowedOrigin("https://claude.ai.evil.example")).toBe(false);
    expect(isAllowedOrigin("http://localhost.evil.example")).toBe(false);
    expect(isAllowedOrigin("https://127.0.0.1.evil.example")).toBe(false);
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });

  it("refuses a downgraded scheme on an allowed host", () => {
    expect(isAllowedOrigin("http://chatgpt.com")).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ariya.example");
    expect(isAllowedOrigin("http://ariya.example")).toBe(false);
  });

  it("refuses a non-http origin, an empty header and the literal 'null'", () => {
    expect(isAllowedOrigin("file://")).toBe(false);
    expect(isAllowedOrigin("")).toBe(false);
    expect(isAllowedOrigin("null")).toBe(false);
    expect(isAllowedOrigin("not a url")).toBe(false);
  });

  it("trusts nothing same-origin when the app URL is unknown", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(isAllowedOrigin("https://ariya.example")).toBe(false);
    expect(isAllowedOrigin("https://claude.ai")).toBe(true);
  });
});
