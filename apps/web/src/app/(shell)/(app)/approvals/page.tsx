import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/layout/screen-header";
import { ApprovalsDesk } from "@/features/approvals/components/ApprovalsDesk";
import { listProposalFeed } from "@/features/approvals/queries";
import { getCurrentUser } from "@/features/auth/queries";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";

export const metadata: Metadata = {
  title: "Approvals • Àríyá",
  description:
    "Approve or reject what a connected AI app has asked to send on your behalf.",
};

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fapprovals");

  const feed = await listProposalFeed();
  const waiting = feed.ok ? feed.data.pending.length : 0;

  return (
    <div className="sm:pb-16">
      <ScreenHeader
        title="Approvals"
        subtitle={
          feed.ok
            ? waiting === 0
              ? "Nothing waiting"
              : `${waiting} waiting on you`
            : undefined
        }
        backHref="/events"
      />
      <DeskMotion className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
        <DeskItem className="standalone:max-md:hidden">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            Approval desk
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold leading-tight text-on-surface sm:mt-2 sm:text-5xl">
            What your AI wants to send
          </h1>
        </DeskItem>

        <DeskItem>
          <section
            aria-label="How approvals work"
            className="profile-card relative overflow-hidden rounded-[28px] p-4 text-champagne sm:p-6"
          >
            <span aria-hidden="true" className="profile-card__weave" />
            <div className="relative flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
                  Your approvals
                </p>
                <p className="mt-1 font-display text-xl text-champagne/75">
                  <span className="mr-1.5 text-4xl font-bold tabular-nums text-[#fff6dc] sm:text-5xl">
                    {waiting}
                  </span>
                  {waiting === 1 ? "request" : "requests"}
                </p>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] text-night shadow-[0_8px_18px_-8px_rgba(0,0,0,0.6)]">
                <Icon name="shield" size={22} />
              </span>
            </div>
            <p className="relative mt-3 text-[13px] leading-relaxed text-champagne/75 sm:text-sm">
              A connected app can read your celebrations and prepare work, but
              it cannot email anyone. Every request to send waits here, in its
              own words, until you decide. Approving one sends exactly once;
              rejecting one costs nothing.
            </p>
          </section>
        </DeskItem>

        <DeskItem>
          {feed.ok ? (
            <ApprovalsDesk initialFeed={feed.data} />
          ) : (
            <p className="rounded-3xl border border-dashed border-hairline bg-white/40 p-5 text-sm text-on-surface-variant backdrop-blur-sm">
              {feed.error}
            </p>
          )}
        </DeskItem>
      </DeskMotion>
    </div>
  );
}
