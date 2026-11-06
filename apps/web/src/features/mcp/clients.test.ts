import { describe, expect, it } from "vitest";
import {
  aiClients,
  claudeCodeCommand,
  codexConfig,
  cursorInstallLink,
  findNewApp,
  vscodeInstallLink,
} from "./clients";
import type { ConnectedApp } from "./types";

const ADDRESS = "https://ariya-two.vercel.app/mcp";
const app = (clientId: string): ConnectedApp => ({
  clientId,
  name: clientId,
  logoUrl: null,
  website: null,
  grantedAt: "2026-11-06T10:00:00Z",
  scopes: [],
});

describe("one-click install links", () => {
  it("builds a Cursor link whose config decodes to the address", () => {
    const link = cursorInstallLink(ADDRESS);
    expect(
      link.startsWith("cursor://anysphere.cursor-deeplink/mcp/install?")
    ).toBe(true);
    const url = new URL(link);
    expect(url.searchParams.get("name")).toBe("ariya");
    const config = JSON.parse(
      Buffer.from(url.searchParams.get("config")!, "base64").toString("utf8")
    );
    expect(config).toEqual({ url: ADDRESS });
  });

  it("builds a VS Code link with URL-encoded JSON", () => {
    const link = vscodeInstallLink(ADDRESS);
    expect(link.startsWith("vscode:mcp/install?")).toBe(true);
    const json = JSON.parse(decodeURIComponent(link.split("?")[1]));
    expect(json).toEqual({ name: "ariya", type: "http", url: ADDRESS });
  });

  it("gives the exact command and setting to paste", () => {
    expect(claudeCodeCommand(ADDRESS)).toBe(
      `claude mcp add --transport http ariya ${ADDRESS}`
    );
    expect(codexConfig(ADDRESS)).toBe(
      `[mcp_servers.ariya]\nurl = "${ADDRESS}"`
    );
  });
});

describe("aiClients", () => {
  const clients = aiClients(ADDRESS);

  it("lists every app once, each with four steps and a button", () => {
    expect(new Set(clients.map((c) => c.id)).size).toBe(clients.length);
    for (const c of clients) {
      expect(c.steps).toHaveLength(4);
      expect(c.action.label.length).toBeGreaterThan(3);
    }
  });

  it("copies the address for the chat apps and opens their connectors page", () => {
    for (const id of ["claude", "chatgpt"]) {
      const action = clients.find((c) => c.id === id)!.action;
      expect(action.kind).toBe("open");
      if (action.kind === "open") {
        expect(action.copy).toBe(ADDRESS);
        expect(action.url.startsWith("https://")).toBe(true);
      }
    }
  });

  it("never puts a secret in anything it copies or links", () => {
    const text = JSON.stringify(clients);
    expect(text).not.toMatch(/token|secret|password/i);
  });
});

describe("findNewApp", () => {
  it("notices an app that was not there at the start", () => {
    expect(findNewApp(new Set(["a"]), [app("a")])).toBeNull();
    expect(findNewApp(new Set(["a"]), [app("a"), app("b")])?.clientId).toBe(
      "b"
    );
    expect(findNewApp(new Set(), [])).toBeNull();
  });
});
