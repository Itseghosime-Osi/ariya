import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { listRecentActivity } from "@/features/approvals/queries";
import { getCurrentUser } from "@/features/auth/queries";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";
import { ActivityList } from "@/features/mcp/components/ActivityList";
import { ConnectedApps } from "@/features/mcp/components/ConnectedApps";
import { ConnectWizard } from "@/features/mcp/components/ConnectWizard";
import { listConnectedApps } from "@/features/mcp/grants";
import { mcpResourceUrl } from "@/features/mcp/metadata";

export const metadata: Metadata = {
  title: "Connect your AI • Àríyá",
  description:
    "Connect Claude, ChatGPT or Codex to your Àríyá celebration desk.",
};

const CARD =
  "rounded-3xl border border-hairline bg-white/40 px-4 pt-5 pb-6 backdrop-blur-sm sm:px-7";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";

export default async function ConnectAiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fconnect-ai");

  const address = mcpResourceUrl();
  const [connected, activity] = await Promise.all([
    listConnectedApps(),
    listRecentActivity(),
  ]);

  const connectedIds = connected.ok
    ? connected.data.map((app) => app.clientId)
    : [];

  return (
    <DeskMotion className="flex flex-col gap-6 pb-16 lg:gap-8">
      <DeskItem>
        <p className={EYEBROW}>AI connections</p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
          Connect your AI
        </h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
          Let Claude, ChatGPT or another AI read your guest list and prepare
          work for you. It runs as you, and anything that sends something waits
          for your approval.
        </p>
      </DeskItem>

      <DeskItem>
        <ConnectWizard address={address} connectedIds={connectedIds} />
      </DeskItem>

      <DeskItem as="section" className={CARD}>
        <p className={EYEBROW}>Connected apps</p>
        <p className="mb-4 mt-2 text-sm text-on-surface-variant">
          Disconnecting cuts an app off immediately. It can ask to come back,
          but only you can approve it again.
        </p>
        {connected.ok ? (
          <ConnectedApps initialApps={connected.data} />
        ) : (
          <p className="rounded-[22px] border border-dashed border-gold/50 p-5 text-sm text-on-surface-variant">
            {connected.error}
          </p>
        )}
      </DeskItem>

      <DeskItem>
        <details className={`group ${CARD} !py-4`}>
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy">
            <span>What it can and cannot do</span>
            <Icon
              name="expand_more"
              size={18}
              className="shrink-0 text-burgundy transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface">
                Allowed
              </p>
              <ul className="mt-2 space-y-2 text-sm text-on-surface-variant">
                {[
                  "Read celebrations, guests, RSVP counts and seating",
                  "Create and edit celebrations, add or import guests, adjust invitation wording",
                  "Prepare an invitation send, a hall layout or a seating plan for you to approve",
                ].map((line) => (
                  <li key={line} className="flex gap-2">
                    <Icon
                      name="check"
                      size={15}
                      className="mt-0.5 shrink-0 text-gold-ink"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface">
                Never
              </p>
              <ul className="mt-2 space-y-2 text-sm text-on-surface-variant">
                {[
                  "Send email or invitations, or use invitation quota",
                  "Delete anything, touch billing or payments, or change team members and sign-in",
                  "Apply a hall or seating change, or approve its own request: those wait for you",
                ].map((line) => (
                  <li key={line} className="flex gap-2">
                    <Icon
                      name="lock"
                      size={15}
                      className="mt-0.5 shrink-0 text-gold-ink"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">
            Guest names and RSVP notes are written by guests, so the tools treat
            them as text to report, never as instructions to follow.
          </p>
          <Link
            href="/connect-ai/guide"
            className="desk-chip mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Read the full guide
            <Icon name="arrow_forward" size={16} />
          </Link>
        </details>
      </DeskItem>

      <DeskItem className={CARD} as="section">
        <p className={EYEBROW}>Recent activity</p>
        <p className="mb-4 mt-2 text-sm text-on-surface-variant">
          What your connected apps have done, newest first. Refusals are listed
          too, so a request that was blocked is never invisible.
        </p>
        {activity.ok ? (
          <ActivityList entries={activity.data} />
        ) : (
          <p className="rounded-[22px] border border-dashed border-gold/50 p-5 text-sm text-on-surface-variant">
            {activity.error}
          </p>
        )}
      </DeskItem>
    </DeskMotion>
  );
}
