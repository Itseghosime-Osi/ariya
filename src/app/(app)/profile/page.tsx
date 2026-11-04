import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { accountInitials } from "@/components/layout/nav-items";
import { getCurrentProfile, getCurrentUser } from "@/features/auth/queries";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";

export const metadata: Metadata = {
  title: "Profile • Àríyá",
  description: "Your Àríyá account.",
};

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";

interface DetailRow {
  label: string;
  value: string;
  icon: IconName;
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fprofile");
  const profile = await getCurrentProfile();

  const email = profile?.email ?? user.email ?? "—";
  const name =
    profile?.full_name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ||
    email;

  const since = new Date(
    profile?.created_at ?? user.created_at
  ).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rows: DetailRow[] = [
    { label: "Email", value: email, icon: "mail" },
    ...(profile?.phone
      ? [{ label: "Phone", value: profile.phone, icon: "phone" as IconName }]
      : []),
    { label: "Host since", value: since, icon: "schedule" },
  ];

  return (
    <DeskMotion className="flex flex-col gap-6 pb-16 lg:gap-8">
      <DeskItem>
        <p className={EYEBROW}>Your account</p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
          Profile
        </h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
          How Àríyá knows you — and the two places you may want next.
        </p>
      </DeskItem>

      <DeskItem className="rounded-3xl border border-outline-variant/60 bg-surface-container-low px-4 py-6 sm:px-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            data-testid="profile-avatar"
            className="grid h-20 w-20 place-items-center rounded-full bg-burgundy font-display text-2xl font-bold text-champagne ring-1 ring-gold/45"
          >
            {accountInitials(email)}
          </span>
          <div className="min-w-0">
            <p className="font-display text-2xl text-on-surface">{name}</p>
            <p className={EYEBROW}>Host</p>
          </div>
        </div>

        <dl className="mt-6 divide-y divide-outline-variant/40">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-3.5">
              <Icon
                name={row.icon}
                size={17}
                className="shrink-0 text-gold-ink"
              />
              <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                {row.label}
              </dt>
              <dd className="ml-auto max-w-[60%] truncate text-right text-sm text-on-surface [overflow-wrap:anywhere]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </DeskItem>

      <DeskItem className="flex flex-col gap-3 rounded-3xl border border-outline-variant/60 bg-surface-container-low px-4 py-5 sm:flex-row sm:items-center sm:gap-5 sm:px-7">
        <div className="min-w-0 flex-1">
          <p className={EYEBROW}>Next</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Connect an app to your celebration desk, or head back to your
            celebrations.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/connect-ai"
            className="desk-chip inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="styler" size={16} />
            Connect to an AI
          </Link>
          <Link
            href="/events"
            className="desk-chip inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="celebration" size={16} />
            Your events
          </Link>
        </div>
      </DeskItem>
    </DeskMotion>
  );
}
