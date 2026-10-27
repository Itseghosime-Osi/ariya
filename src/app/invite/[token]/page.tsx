import React from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getTeamInviteByToken } from "@/features/team/queries";
import { acceptTeamInviteAction } from "@/features/team/actions";
import { Icon } from "@/components/ui/icon";
import { TeamRoleBadge } from "@/features/team/components/TeamRoleBadge";
import type { EventRole } from "@/features/team/types";

export const metadata: Metadata = {
  title: "Team Invitation • Àríyá Celebration Suite",
};

interface InviteAcceptPageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({
  params,
}: InviteAcceptPageProps) {
  const { token } = await params;
  const invite = await getTeamInviteByToken(token);

  if (!invite) {
    notFound();
  }

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?redirectTo=/invite/${token}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-container-lowest">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-outline-variant/60 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-wine/10 text-wine flex items-center justify-center">
          <Icon name="diversity_3" className="text-3xl" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-wine">
            Celebration Suite Invitation
          </span>
          <h1 className="font-serif text-2xl font-bold text-night">
            {invite.eventTitle}
          </h1>
          <p className="text-sm text-on-surface-variant">
            You have been invited to orchestrate this celebration with the
            celebrant team.
          </p>
        </div>

        <div className="bg-surface-container p-4 rounded-2xl space-y-2">
          <div className="text-xs text-on-surface-variant">Assigned Role</div>
          <TeamRoleBadge role={invite.role as EventRole} />
        </div>

        {invite.isExpired ? (
          <div className="bg-red-50 text-red-800 text-sm p-4 rounded-2xl border border-red-200">
            This team invitation has expired. Please ask the event host to
            re-issue your invite.
          </div>
        ) : (
          <form
            action={async () => {
              "use server";
              await acceptTeamInviteAction(token);
            }}
          >
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-wine text-ivory font-semibold hover:bg-wine/90 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Icon name="check_circle" className="text-xl" />
              <span>Accept & Join Team</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
