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
  /** One-tap copy chips under a step, so nothing has to be typed into the app's own form. */
  stepCopies?: StepCopy[];
  /** What the app itself requires of the person, in plain words. */
  notes?: string[];
}

export interface StepCopy {
  /** The zero-based step the chip sits under. */
  step: number;
  label: string;
  value: string;
}

/** What to call the connection when an app asks for a name and a description. */
export const CONNECTION_NAME = "Àríyá";
export const CONNECTION_DESCRIPTION = "Your Àríyá celebration desk";

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

/** Gemini CLI's own command for a remote server; it signs in through a page on this computer. */
export function geminiCliCommand(address: string): string {
  return `gemini mcp add --transport http ${SERVER_NAME} ${address}`;
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
        "In ChatGPT open Plugins (on some accounts it is Settings, then Connectors). If you see Developer mode under Advanced, switch it on.",
        "Press the plus button and choose Add custom MCP server (or Create). Tap each chip below to copy it, then paste it into the matching box.",
        "Pick OAuth if it asks how to sign in, then sign in to Àríyá and press Approve.",
      ],
      stepCopies: [
        { step: 2, label: "Copy name", value: CONNECTION_NAME },
        { step: 2, label: "Copy description", value: CONNECTION_DESCRIPTION },
        { step: 2, label: "Copy link", value: address },
      ],
      notes: [
        "What ChatGPT lets you add depends on your plan. Business, Enterprise and Edu workspaces can add custom connectors; Pro can connect with read and fetch access. If you do not see the option, ask your workspace admin.",
        "ChatGPT has no link that fills the form in for you yet, so these chips stand in for typing.",
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
        "In Gemini open Settings, then Connectors, and choose + Custom.",
        "Tap each chip below to copy it, then paste it into the matching box and save.",
        "Sign in to Àríyá. The card says Not verified, because Gemini is not on our verified list yet: check the address on it is Google's (it ends in googleusercontent.com), tick the box and press Approve.",
      ],
      stepCopies: [
        { step: 2, label: "Copy link", value: address },
        { step: 2, label: "Copy name", value: CONNECTION_NAME },
      ],
      notes: [
        "Gemini adds custom apps on the web, not in the phone app, and only for personal Google accounts. Google is still rolling it out, so it may not be offered in your country yet. If you do not see + Custom, use Claude or ChatGPT, or Gemini CLI on a computer.",
        "Gemini has no link that fills the form in for you yet, so these chips stand in for typing.",
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
