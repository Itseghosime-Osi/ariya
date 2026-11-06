import type { ConnectedApp } from "./types";

export const SERVER_NAME = "ariya";

export type AiClientId =
  | "claude"
  | "chatgpt"
  | "claude-code"
  | "codex"
  | "cursor"
  | "vscode"
  | "other";

/**
 * What the big button does:
 *  - "open": copies the address, then opens the app's own connectors page in a new tab
 *  - "link": a one-click install link the app handles itself (Cursor, VS Code)
 *  - "copy": copies a command or a setting to paste
 */
export type PrimaryAction =
  | { kind: "open"; label: string; url: string; copy: string }
  | { kind: "link"; label: string; href: string }
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

/** Cursor takes the same entry as its mcp.json, base64 encoded, in a cursor:// link. */
export function cursorInstallLink(address: string): string {
  const config = JSON.stringify({ url: address });
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(config, "utf8").toString("base64")
      : btoa(config);
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${SERVER_NAME}&config=${encodeURIComponent(encoded)}`;
}

/** VS Code takes URL-encoded JSON after vscode:mcp/install. */
export function vscodeInstallLink(address: string): string {
  const payload = JSON.stringify({
    name: SERVER_NAME,
    type: "http",
    url: address,
  });
  return `vscode:mcp/install?${encodeURIComponent(payload)}`;
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
      tagline: "Chat app, web or desktop",
      kind: "app",
      glyph: "C",
      action: {
        kind: "open",
        label: "Copy link and open Claude",
        url: "https://claude.ai/settings/connectors",
        copy: address,
      },
      steps: [
        "Press the button. We copy your Àríyá link and open Claude in a new tab.",
        "In Claude, open Settings, then Connectors, and choose Add custom connector.",
        "Name it Àríyá, paste the link (it is already copied) and press Add.",
        "Press Connect. Sign in to Àríyá if asked, then press Approve on the card you see.",
      ],
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      tagline: "Chat app, web or desktop",
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
      id: "cursor",
      name: "Cursor",
      tagline: "One click, no copying",
      kind: "tool",
      glyph: "Cu",
      action: {
        kind: "link",
        label: "Add to Cursor",
        href: cursorInstallLink(address),
      },
      steps: [
        "Press the button. Cursor opens and asks to add Àríyá.",
        "Confirm the install in Cursor.",
        "When Cursor shows Needs login next to Àríyá, press it.",
        "Sign in to Àríyá if asked, then press Approve on the card you see.",
      ],
    },
    {
      id: "vscode",
      name: "VS Code",
      tagline: "One click, no copying",
      kind: "tool",
      glyph: "VS",
      action: {
        kind: "link",
        label: "Add to VS Code",
        href: vscodeInstallLink(address),
      },
      steps: [
        "Press the button. VS Code opens and asks to install Àríyá.",
        "Confirm the install in VS Code.",
        "Start the server when VS Code offers to, and sign in to Àríyá if asked.",
        "Press Approve on the card you see.",
      ],
    },
    {
      id: "claude-code",
      name: "Claude Code",
      tagline: "Terminal, one command",
      kind: "tool",
      glyph: ">_",
      action: {
        kind: "copy",
        label: "Copy the command",
        copy: claudeCodeCommand(address),
      },
      steps: [
        "Press the button to copy the command.",
        "Open your terminal, paste it and press Enter.",
        "In Claude Code, type /mcp, choose ariya and sign in.",
        "Press Approve on the Àríyá card that opens.",
      ],
    },
    {
      id: "codex",
      name: "Codex",
      tagline: "One setting to paste",
      kind: "tool",
      glyph: "Cx",
      action: {
        kind: "copy",
        label: "Copy the setting",
        copy: codexConfig(address),
      },
      steps: [
        "Press the button to copy the setting.",
        "Open ~/.codex/config.toml, paste it at the end and save.",
        "Restart Codex, then sign in to Àríyá when it asks.",
        "Press Approve on the card you see.",
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
