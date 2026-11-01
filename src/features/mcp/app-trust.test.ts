import { describe, expect, it } from "vitest";
import { classifyApp, sanitiseAppName } from "./app-trust";

const CYRILLIC_A = String.fromCharCode(0x430);
const RLO = String.fromCharCode(0x202e);
const BOM = String.fromCharCode(0xfeff);

describe("known apps", () => {
  it("recognises Claude's fixed callback", () => {
    const trust = classifyApp("https://claude.ai/api/mcp/auth_callback");

    expect(trust).toMatchObject({
      tier: "known",
      vendor: "claude",
      host: "claude.ai",
    });
  });

  it("recognises ChatGPT's stable callback", () => {
    const trust = classifyApp(
      "https://chatgpt.com/connector_platform_oauth_redirect"
    );

    expect(trust).toMatchObject({ tier: "known", vendor: "chatgpt" });
  });

  it("recognises ChatGPT's per-connection callback", () => {
    const trust = classifyApp("https://chatgpt.com/connector/oauth/abc123XYZ");

    expect(trust).toMatchObject({ tier: "known", vendor: "chatgpt" });
  });

  it("is unmoved by case in the scheme and host, because the URL parser normalises it", () => {
    const trust = classifyApp("HTTPS://CLAUDE.AI/api/mcp/auth_callback");

    expect(trust).toMatchObject({ tier: "known", vendor: "claude" });
  });
});

describe("look-alikes are refused as known apps", () => {
  const lookAlikes = [
    ["host suffix", "https://claude.ai.evil.com/api/mcp/auth_callback"],
    ["host as path", "https://evil.com/claude.ai/api/mcp/auth_callback"],
    ["userinfo", "https://claude.ai@evil.com/api/mcp/auth_callback"],
    ["userinfo with password", "https://user:pw@claude.ai@evil.com/x"],
    ["plain http", "http://claude.ai/api/mcp/auth_callback"],
    ["unexpected port", "https://claude.ai:8443/api/mcp/auth_callback"],
    ["extra path", "https://claude.ai/api/mcp/auth_callback/extra"],
    ["trailing slash", "https://claude.ai/api/mcp/auth_callback/"],
    ["query string", "https://claude.ai/api/mcp/auth_callback?next=evil.com"],
    ["fragment", "https://claude.ai/api/mcp/auth_callback#@evil.com"],
    ["trailing dot in host", "https://claude.ai./api/mcp/auth_callback"],
    [
      "punycode homoglyph",
      `https://cl${CYRILLIC_A}ude.ai/api/mcp/auth_callback`,
    ],
    ["chatgpt subdomain", "https://chatgpt.com.evil.com/connector/oauth/abc"],
    ["chatgpt empty callback id", "https://chatgpt.com/connector/oauth/"],
    ["chatgpt nested callback id", "https://chatgpt.com/connector/oauth/a/b"],
    ["chatgpt over http", "http://chatgpt.com/connector/oauth/abc"],
    ["chatgpt with query", "https://chatgpt.com/connector/oauth/abc?x=1"],
  ] as const;

  it.each(lookAlikes)("refuses %s", (_label, uri) => {
    expect(classifyApp(uri).tier).toBe("unknown");
  });

  it("refuses a redirect URI that is not a URL at all", () => {
    for (const uri of [
      "",
      "   ",
      "not a url",
      "javascript:alert(1)",
      "file:/etc/passwd",
    ]) {
      expect(classifyApp(uri).tier).toBe("unknown");
    }
  });
});

describe("local apps", () => {
  it.each([
    ["localhost", "http://localhost:3118/callback"],
    ["127.0.0.1", "http://127.0.0.1:4040/callback"],
    ["IPv6 loopback", "http://[::1]:3000/callback"],
    ["loopback over https", "https://localhost:4443/callback"],
    ["loopback without a port", "http://localhost/callback"],
  ])("treats %s as an app on the host's computer", (_label, uri) => {
    expect(classifyApp(uri)).toMatchObject({ tier: "local", vendor: null });
  });

  it.each([
    ["localhost suffix", "http://localhost.evil.com:3118/callback"],
    ["ip octet suffix", "http://127.0.0.1.evil.com/callback"],
    ["localhost as userinfo", "http://localhost@evil.com/callback"],
    ["ip inside a domain", "http://127.0.0.1.evil.com:3000/callback"],
  ])("does not treat %s as local", (_label, uri) => {
    expect(classifyApp(uri).tier).toBe("unknown");
  });
});

describe("the rest is unknown", () => {
  it.each([
    ["any other host", "https://example.com/callback"],
    ["claude.com, which documents no callback", "https://claude.com/callback"],
    ["a tunnel", "https://abc123.ngrok-free.app/callback"],
  ])("classifies %s as unknown", (_label, uri) => {
    expect(classifyApp(uri)).toMatchObject({ tier: "unknown", vendor: null });
  });

  it("reports the trimmed raw string when it cannot parse", () => {
    expect(classifyApp("  not a url  ").redirectUri).toBe("not a url");
  });
});

describe("app names", () => {
  it("removes characters that make a name read as another name", () => {
    expect(sanitiseAppName(`Cla${RLO}ude${BOM}`)).toBe("Claude");
  });

  it("collapses whitespace and trims", () => {
    expect(sanitiseAppName("  Plain    App \n ")).toBe("Plain App");
  });

  it("truncates a name that would crowd out the warning", () => {
    const long = "A".repeat(200);

    expect(sanitiseAppName(long)).toHaveLength(60);
    expect(sanitiseAppName(long).endsWith("…")).toBe(true);
  });

  it("falls back to a neutral label when nothing is left", () => {
    expect(sanitiseAppName(`${RLO}${BOM}   `)).toBe("This app");
  });
});
