import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/layout/screen-header";
import { getCurrentProfile, getCurrentUser } from "@/features/auth/queries";
import { EditProfileButton } from "@/features/auth/components/EditProfileButton";
import { getArchivedEvents, getUserEvents } from "@/features/events/queries";
import { partitionEvents } from "@/features/events/lib/select-events";
import { MonogramSeal } from "@/features/events/components/desk/MonogramSeal";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";
import { formatPhoneDisplay } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Profile • Àríyá",
  description: "Your Àríyá account.",
};

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";
const CARD =
  "overflow-hidden rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm";
const ROW =
  "group flex min-h-[60px] w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-white/55 focus-visible:bg-white/55 focus-visible:outline-none sm:px-5";

function when(daysAway: number) {
  if (daysAway <= 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return `In ${daysAway} days`;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fprofile");
  const [profile, events, archived] = await Promise.all([
    getCurrentProfile(),
    getUserEvents(),
    getArchivedEvents(),
  ]);

  const email = profile?.email ?? user.email ?? "";
  const name =
    profile?.full_name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ||
    email;
  const phone = profile?.phone ?? null;
  const joined = new Date(profile?.created_at ?? user.created_at);
  const since = joined.toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });

  const { upcoming } = partitionEvents(events);
  const next = upcoming[0];
  const guests = events.reduce(
    (n, e) => n + (e.metrics.totalAttendees || 0),
    0
  );

  const stats: { label: string; value: string }[] = [
    { label: "Celebrations", value: String(events.length) },
    { label: "Guests", value: guests.toLocaleString("en-NG") },
    {
      label: "Next",
      value: next ? when(next.metrics.daysAway).replace("In ", "") : "—",
    },
  ];

  const edits = { name, phone, autoOpen: false };

  return (
    <DeskMotion className="flex flex-col gap-6 lg:gap-8">
      <ScreenHeader
        title="Profile"
        backHref="/settings"
        action={{ href: "/settings", icon: "settings", label: "Settings" }}
      />

      <DeskItem className="standalone:max-md:hidden">
        <p className={EYEBROW}>Your account</p>
        <h1 className="mt-1 font-serif text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
          Profile
        </h1>
      </DeskItem>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-8">
        {/* The host card */}
        <DeskItem className="lg:sticky lg:top-24">
          <section
            aria-label="You"
            className="profile-card relative overflow-hidden rounded-[32px] px-5 pb-5 pt-7 text-champagne sm:px-8 sm:pt-9"
          >
            <span aria-hidden="true" className="profile-card__weave" />
            <span aria-hidden="true" className="profile-card__glow" />

            <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
              <EditProfileButton
                {...edits}
                autoOpen={edit === "1"}
                tone="dark"
              />
            </div>

            <div className="relative flex flex-col items-center text-center md:flex-row md:items-center md:gap-6 md:text-left lg:flex-col lg:text-center">
              <span className="profile-card__seal relative grid place-items-center">
                <span aria-hidden="true" className="profile-card__ring" />
                <MonogramSeal
                  text={name}
                  size={104}
                  className="relative drop-shadow-[0_14px_24px_rgba(0,0,0,0.45)]"
                />
              </span>
              <div className="mt-4 w-full min-w-0 md:mt-0 md:flex-1 lg:mt-5 lg:w-full">
                <p
                  data-testid="profile-name"
                  className="font-display text-[2rem] leading-tight text-[#fff6dc] [overflow-wrap:anywhere] sm:text-[2.4rem]"
                >
                  {name}
                </p>
                <p className="mt-1 truncate text-sm text-champagne/70">
                  {email}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start lg:justify-center">
                  <span className="rounded-full bg-gold/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-night">
                    Host
                  </span>
                  <span className="rounded-full border border-gold/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-champagne/80">
                    Since {since}
                  </span>
                </div>
              </div>
            </div>

            <dl className="relative mt-7 grid grid-cols-3 divide-x divide-gold/15 rounded-2xl bg-black/20 py-3 text-center ring-1 ring-inset ring-gold/15">
              {stats.map((s) => (
                <div key={s.label} className="px-2">
                  <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-champagne/55">
                    {s.label}
                  </dt>
                  <dd className="mt-0.5 truncate font-display text-xl text-[#fff6dc] sm:text-2xl">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </DeskItem>

        <div className="flex flex-col gap-6">
          {/* Details: tap one to change it */}
          <DeskItem>
            <h2 className={`${EYEBROW} mb-2 px-1`}>Details</h2>
            <div className={`${CARD} divide-y divide-hairline`}>
              <EditProfileButton {...edits} className={ROW}>
                <DetailRow icon="person" label="Name" value={name} editable />
              </EditProfileButton>
              <div className={ROW}>
                <DetailRow icon="mail" label="Email" value={email} />
              </div>
              <EditProfileButton {...edits} className={ROW}>
                {phone ? (
                  <DetailRow
                    icon="phone"
                    label="Phone"
                    value={formatPhoneDisplay(phone)}
                    editable
                  />
                ) : (
                  <DetailRow
                    icon="phone"
                    label="Phone"
                    value="Add your phone"
                    muted
                    editable
                  />
                )}
              </EditProfileButton>
            </div>
            <p className="mt-2 px-1 text-xs text-label-3">
              Your team and co-planners see your name. To change your email,
              contact support.
            </p>
          </DeskItem>

          {/* Celebrations */}
          <DeskItem>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className={EYEBROW}>Coming up</h2>
              {events.length > 0 && (
                <Link
                  href="/events"
                  className="text-xs font-semibold text-burgundy hover:underline"
                >
                  All celebrations
                </Link>
              )}
            </div>
            <div className={`${CARD} divide-y divide-hairline`}>
              {upcoming.length === 0 ? (
                <Link href="/events/new" className={ROW}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-burgundy text-champagne">
                    <Icon name="add_circle" size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-night">
                      Plan a celebration
                    </span>
                    <span className="block text-[12.5px] text-label-2">
                      Set the date, venue and guest list
                    </span>
                  </span>
                  <Icon
                    name="chevron_right"
                    size={18}
                    className="text-label-3"
                  />
                </Link>
              ) : (
                upcoming.slice(0, 3).map(({ event, metrics }) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className={ROW}
                  >
                    <MonogramSeal
                      text={event.couple || event.title}
                      size={40}
                      className="shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-night">
                        {event.title}
                      </span>
                      <span className="block text-[12.5px] text-label-2">
                        {when(metrics.daysAway)} ·{" "}
                        {metrics.totalAttendees.toLocaleString("en-NG")}{" "}
                        {metrics.totalAttendees === 1 ? "guest" : "guests"}
                      </span>
                    </span>
                    <Icon
                      name="chevron_right"
                      size={18}
                      className="shrink-0 text-label-3 transition-transform group-hover:translate-x-0.5 group-hover:text-burgundy"
                    />
                  </Link>
                ))
              )}
            </div>
          </DeskItem>

          {/* Filed-away celebrations */}
          <DeskItem>
            <Link
              href="/profile/archive"
              data-testid="profile-archive-link"
              className={`${CARD} ${ROW}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-burgundy/[0.07] text-gold-ink">
                <Icon name="folder" size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-night">
                  Archive
                </span>
                <span className="block text-[12.5px] text-label-2">
                  {archived.length === 0
                    ? "Celebrations you file away appear here"
                    : `${archived.length} ${archived.length === 1 ? "celebration" : "celebrations"} filed away`}
                </span>
              </span>
              <Icon
                name="chevron_right"
                size={18}
                className="shrink-0 text-label-3 transition-transform group-hover:translate-x-0.5 group-hover:text-burgundy"
              />
            </Link>
          </DeskItem>

          {/* Where everything else lives */}
          <DeskItem>
            <Link
              href="/settings"
              data-testid="profile-settings-link"
              className={`${CARD} ${ROW}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#3a2a30] to-[#1c0f14] text-champagne">
                <Icon name="settings" size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-night">
                  Settings
                </span>
                <span className="block text-[12.5px] text-label-2">
                  Notifications, security and app preferences
                </span>
              </span>
              <Icon
                name="chevron_right"
                size={18}
                className="shrink-0 text-label-3 transition-transform group-hover:translate-x-0.5 group-hover:text-burgundy"
              />
            </Link>
          </DeskItem>
        </div>
      </div>
    </DeskMotion>
  );
}

function DetailRow({
  icon,
  label,
  value,
  editable,
  muted,
}: {
  icon: IconName;
  label: string;
  value: string;
  editable?: boolean;
  muted?: boolean;
}) {
  return (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-burgundy/[0.07] text-gold-ink">
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-label-2">
          {label}
        </span>
        <span
          className={`block truncate text-[15px] ${muted ? "font-semibold text-burgundy" : "text-night"}`}
        >
          {value}
        </span>
      </span>
      {editable && (
        <Icon
          name={muted ? "add_circle" : "edit"}
          size={16}
          className="shrink-0 text-label-3 transition-colors group-hover:text-burgundy"
        />
      )}
    </>
  );
}
