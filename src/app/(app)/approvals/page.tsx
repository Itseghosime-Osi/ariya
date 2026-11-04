import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

  return (
    <DeskMotion className="flex flex-col gap-6 pb-16 lg:gap-8">
      <DeskItem>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
          Approval desk
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
          What your AI wants to send
        </h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
          A connected app can read your celebrations and prepare work, but it
          cannot email anyone. Every request to send waits here, in its own
          words, until you decide. Approving one sends exactly once; rejecting
          one costs nothing.
        </p>
      </DeskItem>

      <DeskItem>
        {feed.ok ? (
          <ApprovalsDesk initialFeed={feed.data} />
        ) : (
          <p className="rounded-[22px] border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm text-on-surface-variant">
            {feed.error}
          </p>
        )}
      </DeskItem>
    </DeskMotion>
  );
}
