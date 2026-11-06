import type { ConnectedApp } from "./types";

export const SERVER_NAME = "ariya";

export type AiClientId = "claude" | "chatgpt" | "gemini" | "other";

/**
 * What the big button does:
 *  - "open": opens the app's connectors page in a new tab. When the app accepts a prefilled link
 *    (Claude does) nothing needs copying; otherwise `copy` is put on the clipboard first.
 *  - "copy": copies a value to paste
 */
export type PrimaryAction =
  | { kind: "open"; label: string; url: string; copy?: string }
  | { kind: "copy"; label: string; copy: string };

export interface AiClient {
  id: AiClientId;
  name: string;
  /** One short line under the name on its tile. */
  tagline: string;
  /** "app" means a chat app; "tool" is for people who write code. */
  kind: "app" | "tool";
  /** The letter on its tile: a plain monogram, never a borrowed logo. */
  glyph: string;
  action: PrimaryAction;
  /** Plain-language steps. The first is what the big button just did. */
  steps: string[];
}

/**
 * Claude's own install link: the Add custom connector dialog opens with the name and address
 * already filled in, and the person only has to review and press Add. Anthropic documents the
 * parameters (modal, connectorName, connectorUrl); the link grants nothing by itself.
 */
export function claudeInstallLink(address: string): string {
  return `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent("Àríyá")}&connectorUrl=${encodeURIComponent(address)}`;
}

export function claudeCodeCommand(address: string): string {
  return `claude mcp add --transport http ${SERVER_NAME} ${address}`;
}

export function codexConfig(address: string): string {
  return `[mcp_servers.${SERVER_NAME}]\nurl = "${address}"`;
}

export function aiClients(address: string): AiClient[] {
  return [
    {
      id: "claude",
      name: "Claude",
      tagline: "Opens with Àríyá filled in",
      kind: "app",
      glyph: "C",
      action: {
        kind: "open",
        label: "Open Claude and connect",
        url: claudeInstallLink(address),
      },
      steps: [
        "Press the button. Claude opens in a new tab with Àríyá already filled in, so there is nothing to copy.",
        "Check the name and press Add.",
        "Press Connect and sign in to Àríyá if asked.",
        "Press Approve on the card you see. That is the whole connection.",
      ],
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      tagline: "We copy the link for you",
      kind: "app",
      glyph: "G",
      action: {
        kind: "open",
        label: "Copy link and open ChatGPT",
        url: "https://chatgpt.com/",
        copy: address,
      },
      steps: [
        "Press the button. We copy your Àríyá link and open ChatGPT in a new tab.",
        "Open Settings and find Connectors (menus move around, so look for Apps or Connectors). If you see Developer mode under Advanced, switch it on.",
        "Choose to create a new connector, name it Àríyá and paste the link.",
        "Pick OAuth if it asks how to sign in, then sign in to Àríyá and press Approve.",
      ],
    },
    {
      id: "gemini",
      name: "Gemini",
      tagline: "We copy the link for you",
      kind: "app",
      glyph: "Ge",
      action: {
        kind: "open",
        label: "Copy link and open Gemini",
        url: "https://gemini.google.com/",
        copy: address,
      },
      steps: [
        "Press the button. We copy your Àríyá link and open Gemini in a new tab.",
        "Open Settings and find Connected apps (it can also be called Connectors), then choose Add a custom app.",
        "Paste the link and press Next.",
        "Sign in to Àríyá if asked, then press Approve on the card you see.",
      ],
    },
    {
      id: "other",
      name: "Another app",
      tagline: "Any app that takes an MCP link",
      kind: "app",
      glyph: "+",
      action: { kind: "copy", label: "Copy the MCP link", copy: address },
      steps: [
        "Press the button to copy your Àríyá MCP link.",
        "In your app, add a remote (HTTP) MCP server and paste the link.",
        "Sign in to Àríyá if asked.",
        "Press Approve on the card you see.",
      ],
    },
  ];
}

/** An app that was not connected when the host began, and is now. */
export function findNewApp(
  baselineIds: ReadonlySet<string>,
  apps: readonly ConnectedApp[]
): ConnectedApp | null {
  return apps.find((app) => !baselineIds.has(app.clientId)) ?? null;
}

/** A few things to say once connected, so the first message is not a blank page. */
export const FIRST_PROMPTS = [
  "Who has not replied to my invitation yet?",
  "Summarise my guest list by side and by group.",
  "Prepare a gentle reminder for the guests who have not replied.",
] as const;
