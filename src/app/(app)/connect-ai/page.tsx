import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/features/auth/queries";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";
import { ConnectedApps } from "@/features/mcp/components/ConnectedApps";
import { CopyButton } from "@/features/mcp/components/CopyButton";
import { listConnectedApps } from "@/features/mcp/grants";
import { mcpResourceUrl } from "@/features/mcp/metadata";

export const metadata: Metadata = {
  title: "Connect your AI • Àríyá",
  description:
    "Connect Claude, ChatGPT or Codex to your Àríyá celebration desk.",
};

const CARD =
  "rounded-3xl border border-outline-variant/60 bg-surface-container-low px-4 pt-5 pb-6 sm:px-7";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";
const CODE =
  "block overflow-x-auto whitespace-pre rounded-2xl border border-wine/10 bg-ivory px-4 py-3 font-mono text-xs leading-relaxed text-on-surface";

export default async function ConnectAiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fconnect-ai");

  const address = mcpResourceUrl();
  const connected = await listConnectedApps();

  return (
    <DeskMotion className="flex flex-col gap-6 pb-16 lg:gap-8">
      <DeskItem>
        <p className={EYEBROW}>AI connections</p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
          Connect your AI
        </h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
          Your celebration desk speaks MCP, so Claude, ChatGPT or Codex can read
          your guest list and make changes for you. It runs as you: same
          celebrations, same permissions.
        </p>
      </DeskItem>

      <DeskItem className={CARD}>
        <p className={EYEBROW}>Your address</p>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
          Every app below asks for this one URL. It is the same for everyone you
          connect.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code
            data-testid="mcp-address"
            className="min-w-0 flex-1 break-all rounded-2xl border border-wine/10 bg-ivory px-4 py-3 font-mono text-xs text-on-surface"
          >
            {address}
          </code>
          <CopyButton value={address} label="Copy address" />
        </div>
      </DeskItem>

      <DeskItem className={CARD}>
        <div className="flex items-center gap-2">
          <Icon name="check_circle" size={16} className="text-gold-ink" />
          <p className={EYEBROW}>Claude Code</p>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">
          Paste this into your terminal once. Claude Code keeps the connection
          between sessions.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <code
            className={CODE}
          >{`claude mcp add --transport http ariya ${address}`}</code>
          <CopyButton
            value={`claude mcp add --transport http ariya ${address}`}
            label="Copy command"
          />
        </div>
      </DeskItem>

      <DeskItem className={CARD}>
        <p className={EYEBROW}>Claude.ai and ChatGPT</p>
        <p className="mt-2 text-sm text-on-surface-variant">
          In the app, open the connectors settings (ChatGPT: Settings →
          Connectors; Claude: Settings → Connectors), add a custom or remote MCP
          server, and give it the address above.
        </p>
        <p className="mt-3 text-sm text-on-surface-variant">
          Connecting grants nothing on its own. Àríyá sends you to a sign-in
          screen and an approval card first, and the app gets nothing until you
          approve it there.
        </p>
      </DeskItem>

      <DeskItem className={CARD}>
        <p className={EYEBROW}>Codex</p>
        <p className="mt-2 text-sm text-on-surface-variant">
          Add a server block to{" "}
          <code className="font-mono">~/.codex/config.toml</code>:
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <code
            className={CODE}
          >{`[mcp_servers.ariya]\nurl = "${address}"`}</code>
          <CopyButton
            value={`[mcp_servers.ariya]\nurl = "${address}"`}
            label="Copy config"
          />
        </div>
      </DeskItem>

      <DeskItem className={CARD}>
        <p className={EYEBROW}>What it can and cannot do</p>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface">
              Allowed
            </p>
            <ul className="mt-2 space-y-2 text-sm text-on-surface-variant">
              <li className="flex gap-2">
                <Icon
                  name="check"
                  size={15}
                  className="mt-0.5 shrink-0 text-gold-ink"
                />
                <span>Read celebrations, guests, RSVP counts and seating</span>
              </li>
              <li className="flex gap-2">
                <Icon
                  name="check"
                  size={15}
                  className="mt-0.5 shrink-0 text-gold-ink"
                />
                <span>
                  Create and edit celebrations, add or import guests, adjust
                  invitation wording
                </span>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface">
              Never
            </p>
            <ul className="mt-2 space-y-2 text-sm text-on-surface-variant">
              <li className="flex gap-2">
                <Icon
                  name="lock"
                  size={15}
                  className="mt-0.5 shrink-0 text-gold-ink"
                />
                <span>Send email or invitations, or use invitation quota</span>
              </li>
              <li className="flex gap-2">
                <Icon
                  name="lock"
                  size={15}
                  className="mt-0.5 shrink-0 text-gold-ink"
                />
                <span>
                  Delete anything, touch billing or payments, or change team
                  members and sign-in
                </span>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">
          Guest names and RSVP notes are written by guests, so the tools treat
          them as text to report, never as instructions to follow.
        </p>
      </DeskItem>

      <DeskItem className={CARD} as="section">
        <p className={EYEBROW}>Connected apps</p>
        <p className="mb-4 mt-2 text-sm text-on-surface-variant">
          Disconnecting cuts an app off immediately. It can ask to come back,
          but only you can approve it again.
        </p>
        {connected.ok ? (
          <ConnectedApps initialApps={connected.data} />
        ) : (
          <p className="rounded-[22px] border border-dashed border-outline-variant bg-ivory p-5 text-sm text-on-surface-variant">
            {connected.error}
          </p>
        )}
      </DeskItem>
    </DeskMotion>
  );
}
