import { describe, expect, it } from "vitest";
import {
  aiClients,
  claudeInstallLink,
  claudeCodeCommand,
  codexConfig,
  geminiCliCommand,
  findNewApp,
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

describe("install links and commands", () => {
  it("builds Claude's prefilled link exactly as Anthropic documents it", () => {
    const link = claudeInstallLink(ADDRESS);
    const url = new URL(link);
    expect(url.origin + url.pathname).toBe(
      "https://claude.ai/customize/connectors"
    );
    expect(url.searchParams.get("modal")).toBe("add-custom-connector");
    expect(url.searchParams.get("connectorName")).toBe("Àríyá");
    expect(url.searchParams.get("connectorUrl")).toBe(ADDRESS);
    // The address is percent-encoded, not left raw in the query.
    expect(link).toContain(encodeURIComponent(ADDRESS));
  });

  it("gives the exact command and setting for developer tools", () => {
    expect(claudeCodeCommand(ADDRESS)).toBe(
      `claude mcp add --transport http ariya ${ADDRESS}`
    );
    expect(geminiCliCommand(ADDRESS)).toBe(
      `gemini mcp add --transport http ariya ${ADDRESS}`
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

  it("offers everyday AI assistants, not coding tools", () => {
    expect(clients.map((c) => c.id)).toEqual([
      "claude",
      "chatgpt",
      "gemini",
      "other",
    ]);
    expect(clients.every((c) => c.kind === "app")).toBe(true);
  });

  it("needs no copying for Claude, which takes a prefilled link", () => {
    const action = clients.find((c) => c.id === "claude")!.action;
    expect(action.kind).toBe("open");
    if (action.kind === "open") {
      expect(action.copy).toBeUndefined();
      expect(action.url).toBe(claudeInstallLink(ADDRESS));
    }
  });

  it("copies the link and opens ChatGPT and Gemini, which have no prefilled link", () => {
    for (const id of ["chatgpt", "gemini"]) {
      const action = clients.find((c) => c.id === id)!.action;
      expect(action.kind).toBe("open");
      if (action.kind === "open") {
        expect(action.copy).toBe(ADDRESS);
        expect(action.url.startsWith("https://")).toBe(true);
      }
    }
  });

  it("gives ChatGPT and Gemini copy chips so nothing is typed into their forms", () => {
    for (const id of ["chatgpt", "gemini"]) {
      const client = clients.find((c) => c.id === id)!;
      const chips = client.stepCopies ?? [];
      expect(chips.some((c) => c.value === ADDRESS)).toBe(true);
      expect(chips.some((c) => c.value === "Àríyá")).toBe(true);
      for (const chip of chips) {
        expect(chip.step).toBeGreaterThanOrEqual(0);
        expect(chip.step).toBeLessThan(client.steps.length);
      }
      expect((client.notes ?? []).length).toBeGreaterThan(0);
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
