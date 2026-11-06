"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignOutConfirmation } from "@/components/layout/SignOutConfirmation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  resetPasswordAction,
  signOutEverywhereAction,
} from "@/features/auth/actions";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { PasswordStrengthMeter } from "@/features/auth/components/PasswordStrengthMeter";
import { useAppNotifications } from "@/features/notifications/use-app-notifications";
import { Keys, SHORTCUTS } from "@/features/seating/hall/shortcuts";
import { readDevicePref, writeDevicePref, type DevicePref } from "../prefs";

export interface SettingsAccount {
  name: string;
  email: string;
  initials: string;
  since: string;
}

export interface SettingsEvent {
  id: string;
  title: string;
  couple: string | null;
  date: string;
  role: "owner" | "planner" | "couple" | "staff";
}

interface SettingsDeskProps {
  account: SettingsAccount;
  events: SettingsEvent[];
  guestCount: number;
  pendingApprovals: number;
  publicKey?: string;
}

type Tone = "wine" | "gold" | "night" | "rose" | "sage";

const TONES: Record<Tone, string> = {
  wine: "from-[#8a1c36] to-[#4a0f1c] text-champagne",
  gold: "from-[#e2bb6c] to-[#a8752f] text-night",
  night: "from-[#3a2a30] to-[#1c0f14] text-champagne",
  rose: "from-[#e58a9c] to-[#b0485f] text-white",
  sage: "from-[#7fae8e] to-[#3f6b50] text-white",
};

const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "security", label: "Sign-in & security", icon: "lock" },
  { id: "device", label: "On this device", icon: "tune" },
  { id: "celebrations", label: "Celebrations", icon: "celebration" },
  { id: "apps", label: "Connected apps", icon: "styler" },
  { id: "help", label: "Help & about", icon: "help" },
];

const ROLE_LABEL: Record<SettingsEvent["role"], string> = {
  owner: "Owner",
  planner: "Planner",
  couple: "Couple",
  staff: "Staff",
};

/**
 * Settings: how Àríyá behaves for this host and on this device. Who they are (name, phone, photo)
 * lives on the Profile page, which the host pass at the top opens.
 */
export function SettingsDesk({
  account,
  events,
  guestCount,
  pendingApprovals,
  publicKey,
}: SettingsDeskProps) {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [sheet, setSheet] = useState<
    null | "passcode" | "everywhere" | "shortcuts" | "install"
  >(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  // A section picked in the menu stays lit while the page scrolls to it.
  const pickedUntil = useRef(0);

  // Highlight the section in view in the desktop rail.
  useEffect(() => {
    // The section whose heading has passed a third of the way down the screen; at the very
    // bottom of the page the last one, even when it is too short to reach that line.
    const update = () => {
      if (Date.now() < pickedUntil.current) return;
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 8) {
        setActive(SECTIONS[SECTIONS.length - 1].id);
        return;
      }
      let current = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight / 3) {
          current = id;
        }
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="settings-desk">
      <ScreenHeader
        title="Settings"
        backHref="/events"
        action={{
          href: "/profile?edit=1",
          icon: "edit",
          label: "Edit profile",
        }}
      />
      <header
        className="wiz-rise mb-6 standalone:max-md:hidden lg:mb-10"
        style={{ "--i": 0 } as React.CSSProperties}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
          Your account
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
          Settings
        </h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
          Notifications, security and how Àríyá behaves on this device.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-12 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Rail: host pass, then (on desktop) a menu of the sections */}
        <aside className="lg:sticky lg:top-24">
          <HostPass
            account={account}
            celebrations={events.length}
            guests={guestCount}
          />
          <nav aria-label="Settings sections" className="mt-6 hidden lg:block">
            <ul className="space-y-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={() => {
                      pickedUntil.current = Date.now() + 900;
                      setActive(s.id);
                    }}
                    aria-current={active === s.id ? "true" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all",
                      active === s.id
                        ? "bg-burgundy text-champagne shadow-[0_10px_30px_-14px_rgba(74,15,28,0.8)]"
                        : "text-label-2 hover:bg-white/55 hover:text-night"
                    )}
                  >
                    <Icon
                      name={s.icon}
                      size={17}
                      className={cn(
                        "transition-transform group-hover:scale-110",
                        active === s.id ? "text-gold" : "text-gold-ink"
                      )}
                    />
                    {s.label}
                    {s.id === "apps" && pendingApprovals > 0 && (
                      <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-night">
                        {pendingApprovals}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setSignOutOpen(true)}
              className="mt-6 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-[#9b2c44] transition-colors hover:bg-[#9b2c44]/[0.07]"
            >
              <Icon name="logout" size={17} />
              Sign out
            </button>
          </nav>
        </aside>

        <div className="mt-8 space-y-8 lg:mt-0 lg:max-w-2xl lg:space-y-10">
          <NotificationsSection publicKey={publicKey} />

          <Section id="security" title="Sign-in & security" index={2}>
            <Row
              icon="lock"
              tone="night"
              label="Change passcode"
              hint="Choose a new passcode for signing in"
              onClick={() => setSheet("passcode")}
            />
            <Row
              icon="shield"
              tone="night"
              label="Sign out of all devices"
              hint="Ends every session, including this one"
              onClick={() => setSheet("everywhere")}
            />
          </Section>

          <Section
            id="device"
            title="On this device"
            note="Saved on this phone or computer only."
            index={3}
          >
            <PrefRow
              pref="splash"
              icon="celebration"
              tone="rose"
              label="Launch screen"
              hint="Petals and a greeting when you open the installed app"
            />
            <PrefRow
              pref="fireworks"
              icon="magic"
              tone="gold"
              label="Wedding-day fireworks"
              hint="A celebration when you open Àríyá on the big day"
            />
            <Row
              icon="grip"
              tone="night"
              label="Hall Studio shortcuts"
              hint="Letter keys for every tool in the 3D hall"
              onClick={() => setSheet("shortcuts")}
            />
          </Section>

          <Section
            id="celebrations"
            title="Celebrations"
            note="Each celebration's details, page address and visibility."
            index={4}
          >
            {events.length === 0 ? (
              <Row
                icon="add_circle"
                tone="wine"
                label="Plan your first celebration"
                hint="Set up the date, venue and guest list"
                href="/events/new"
              />
            ) : (
              events.map((e) => (
                <Row
                  key={e.id}
                  monogram={(e.couple || e.title).trim().charAt(0) || "À"}
                  tone="wine"
                  label={e.title}
                  hint={formatDate(e.date)}
                  badge={e.role === "owner" ? undefined : ROLE_LABEL[e.role]}
                  href={`/events/${e.id}/settings`}
                />
              ))
            )}
          </Section>

          <Section id="apps" title="Connected apps" index={5}>
            <Row
              icon="styler"
              tone="gold"
              label="AI connections"
              hint="Claude, ChatGPT or Gemini on your celebration desk"
              href="/connect-ai"
            />
            <Row
              icon="verified"
              tone="gold"
              label="Approvals"
              hint="Requests from connected apps that need your yes"
              href="/approvals"
              badge={
                pendingApprovals > 0 ? `${pendingApprovals} waiting` : undefined
              }
              badgeTone="gold"
            />
          </Section>

          <Section id="help" title="Help & about" index={6}>
            <Row
              icon="download"
              tone="sage"
              label="Install Àríyá"
              hint="Put Àríyá on your home screen like an app"
              onClick={() => setSheet("install")}
            />
            <Row
              icon="info"
              tone="sage"
              label="About Àríyá"
              hint="The story, the film and the people behind it"
              href="/about"
            />
          </Section>

          {/* Phone and tablet: sign out at the foot of the list */}
          <button
            type="button"
            onClick={() => setSignOutOpen(true)}
            className="wiz-rise flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[22px] border border-hairline bg-white/40 text-sm font-semibold text-[#9b2c44] transition-colors hover:bg-[#9b2c44]/[0.06] lg:hidden"
            style={{ "--i": 7 } as React.CSSProperties}
          >
            <Icon name="logout" size={18} />
            Sign out
          </button>

          <p className="text-center text-[11px] uppercase tracking-[0.24em] text-label-3 lg:text-left">
            Àríyá · made for owambe
          </p>
        </div>
      </div>

      <PasscodeSheet
        open={sheet === "passcode"}
        onClose={() => setSheet(null)}
      />
      <EverywhereSheet
        open={sheet === "everywhere"}
        onClose={() => setSheet(null)}
      />
      <ShortcutsSheet
        open={sheet === "shortcuts"}
        onClose={() => setSheet(null)}
      />
      <InstallSheet open={sheet === "install"} onClose={() => setSheet(null)} />
      <SignOutConfirmation open={signOutOpen} onOpenChange={setSignOutOpen} />
    </div>
  );
}

function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Date to be set";
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
}

/* ---------------------------------------------------------------- host pass */

/** A wine-and-gold card for the host: who they are at a glance, and the way into their profile. */
function HostPass({
  account,
  celebrations,
  guests,
}: {
  account: SettingsAccount;
  celebrations: number;
  guests: number;
}) {
  const card = useRef<HTMLAnchorElement>(null);
  // A gentle tilt towards the pointer on devices that hover.
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !card.current) return;
    const r = card.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.current.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    card.current.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
    card.current.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(0)}%`);
  };
  const onLeave = () => {
    card.current?.style.setProperty("--rx", "0deg");
    card.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <Link
      ref={card}
      href="/profile"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-label={`${account.name}, view your profile`}
      data-testid="settings-host-pass"
      className="host-pass wiz-rise group relative block overflow-hidden rounded-[28px] p-5 text-champagne outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 sm:p-6"
      style={{ "--i": 1 } as React.CSSProperties}
    >
      <span aria-hidden="true" className="host-pass__glow" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-3 right-4 select-none font-display text-[6.5rem] italic leading-none text-gold/[0.1]"
      >
        À
      </span>
      <span aria-hidden="true" className="host-pass__sheen" />

      <div className="relative flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f6e2ad] via-[#d7ae62] to-[#a8752f] font-display text-lg font-bold text-night shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] ring-2 ring-[#2a0610]">
          {account.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-2xl leading-tight text-[#fff6dc]">
            {account.name}
          </span>
          <span className="block truncate text-[13px] text-champagne/70">
            {account.email}
          </span>
        </span>
      </div>

      <dl className="relative mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-black/20 p-3 text-center ring-1 ring-inset ring-gold/15">
        <div>
          <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-champagne/55">
            Celebrations
          </dt>
          <dd className="mt-0.5 font-display text-xl text-[#fff6dc]">
            {celebrations}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-champagne/55">
            Guests
          </dt>
          <dd className="mt-0.5 font-display text-xl text-[#fff6dc]">
            {guests.toLocaleString("en-NG")}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-champagne/55">
            Host since
          </dt>
          <dd className="mt-0.5 font-display text-xl text-[#fff6dc]">
            {account.since}
          </dd>
        </div>
      </dl>

      <span className="relative mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
        View profile
        <Icon
          name="arrow_forward"
          size={16}
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- building blocks */

function Section({
  id,
  title,
  note,
  index,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="wiz-rise scroll-mt-24"
      style={{ "--i": index + 1 } as React.CSSProperties}
    >
      <h2
        id={`${id}-title`}
        className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink"
      >
        {title}
      </h2>
      <div className="overflow-hidden rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm divide-y divide-hairline">
        {children}
      </div>
      {note && <p className="mt-2 px-1 text-xs text-label-3">{note}</p>}
    </section>
  );
}

interface RowProps {
  icon?: IconName;
  monogram?: string;
  tone: Tone;
  label: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
  badgeTone?: "gold" | "plain";
  trailing?: React.ReactNode;
  disabled?: boolean;
}

function Row({
  icon,
  monogram,
  tone,
  label,
  hint,
  href,
  onClick,
  badge,
  badgeTone = "plain",
  trailing,
  disabled,
}: RowProps) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_14px_-8px_rgba(28,7,13,0.6)] transition-transform duration-300 group-hover:scale-105",
          TONES[tone]
        )}
      >
        {monogram ? (
          <span className="font-display text-lg italic leading-none">
            {monogram}
          </span>
        ) : (
          icon && <Icon name={icon} size={18} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-night">
          {label}
        </span>
        {hint && (
          <span className="block text-[12.5px] leading-snug text-label-2 line-clamp-2 sm:truncate">
            {hint}
          </span>
        )}
      </span>
      {badge && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
            badgeTone === "gold"
              ? "bg-gold text-night"
              : "bg-burgundy/[0.07] text-gold-ink"
          )}
        >
          {badge}
        </span>
      )}
      {trailing ??
        ((href || onClick) && (
          <Icon
            name="chevron_right"
            size={18}
            className="shrink-0 text-label-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-burgundy"
          />
        ))}
    </>
  );
  const cls =
    "group flex min-h-[64px] w-full items-center gap-3.5 px-4 py-3 text-left outline-none transition-colors focus-visible:bg-white/55 sm:px-5";
  if (href) {
    return (
      <Link href={href} className={cn(cls, "hover:bg-white/55")}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(cls, "hover:bg-white/55 disabled:opacity-60")}
      >
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

function PrefRow({
  pref,
  ...row
}: { pref: DevicePref } & Omit<RowProps, "trailing">) {
  // Read after mounting: the server cannot see this device's storage.
  const [on, setOn] = useState(true);
  useEffect(() => setOn(readDevicePref(pref)), [pref]);
  return (
    <Row
      {...row}
      trailing={
        <Switch
          on={on}
          label={row.label}
          onChange={(next) => {
            setOn(next);
            writeDevicePref(pref, next);
          }}
        />
      }
    />
  );
}

/* ---------------------------------------------------------------- notifications */

function NotificationsSection({ publicKey }: { publicKey?: string }) {
  const { state, message, pending, turnOn, turnOff, sendTest } =
    useAppNotifications(publicKey);
  const on = state === "on";
  const hint =
    state === "on"
      ? "On for this device"
      : state === "off"
        ? "Know the moment a guest replies"
        : state === "blocked"
          ? "Blocked in this browser's settings"
          : state === "install-first"
            ? "Add Àríyá to your Home Screen first"
            : state === "unsupported"
              ? "Not available in this browser"
              : "Checking this device…";

  return (
    <Section id="notifications" title="Notifications" index={1}>
      <Row
        icon={on ? "notifications" : "notifications_off"}
        tone="wine"
        label="App notifications"
        hint={hint}
        trailing={
          state === "on" || state === "off" ? (
            <Switch
              on={on}
              label="App notifications"
              disabled={pending}
              onChange={(next) => (next ? turnOn() : turnOff())}
            />
          ) : undefined
        }
      />
      {on && (
        <Row
          icon="outgoing_mail"
          tone="wine"
          label={pending ? "Sending…" : "Send a test notification"}
          hint="Check it arrives on this device"
          onClick={sendTest}
          disabled={pending}
        />
      )}
      {(state === "blocked" || state === "install-first" || message) && (
        <div className="px-4 py-3 text-[13px] sm:px-5" role="status">
          {state === "install-first" && (
            <p className="text-label-2">
              On iPhone and iPad, tap <strong>Share</strong> then{" "}
              <strong>Add to Home Screen</strong>, open Àríyá from there and
              turn notifications on here.
            </p>
          )}
          {state === "blocked" && (
            <p className="text-label-2">
              Allow notifications for Àríyá in your phone or browser settings,
              then come back here.
            </p>
          )}
          {message && (
            <p
              className={cn(
                "font-medium",
                message.tone === "good" ? "text-emerald-700" : "text-red-700"
              )}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- sheets */

/** A bottom sheet on phones, a centred panel on bigger screens. */
function Panel({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const phone = useIsMobile();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        sheet={phone}
        className={cn(!phone && "rounded-[28px] p-7")}
      >
        {phone && (
          <div
            aria-hidden="true"
            className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-gold-ink/35"
          />
        )}
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-night">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-label-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function PasscodeSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const close = () => {
    onClose();
    setTimeout(() => {
      setPassword("");
      setConfirm("");
      setError(null);
      setDone(false);
    }, 200);
  };

  return (
    <Panel
      open={open}
      onClose={close}
      title="Change passcode"
      description="Use at least 8 characters, with a number and a symbol."
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-600/10 text-emerald-700">
            <Icon name="check_circle" size={28} />
          </span>
          <p className="font-semibold text-night">Your passcode is changed.</p>
          <button
            type="button"
            onClick={close}
            className="mt-2 min-h-[48px] w-full rounded-2xl bg-burgundy text-sm font-semibold text-champagne"
          >
            Done
          </button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const res = await resetPasswordAction({
                password,
                confirmPassword: confirm,
              });
              if (res.ok) setDone(true);
              else setError(res.error);
            });
          }}
        >
          <PasswordField
            id="new-passcode"
            label="New passcode"
            value={password}
            onChange={setPassword}
            disabled={pending}
          />
          <PasswordStrengthMeter password={password} />
          <PasswordField
            id="confirm-passcode"
            label="Confirm new passcode"
            value={confirm}
            onChange={setConfirm}
            disabled={pending}
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || !password || !confirm}
            className="min-h-[48px] w-full rounded-2xl bg-burgundy text-sm font-semibold text-champagne shadow-[0_12px_30px_-14px_rgba(74,15,28,0.9)] transition-opacity disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save new passcode"}
          </button>
        </form>
      )}
    </Panel>
  );
}

function EverywhereSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Sign out of all devices?"
      description="Every phone, tablet and computer signed in to your account will be signed out, including this one. You can sign back in with your passcode."
    >
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await signOutEverywhereAction();
              if (!res.ok) {
                setError(res.error);
                return;
              }
              router.replace("/sign-in");
              router.refresh();
            })
          }
          className="min-h-[48px] flex-1 rounded-2xl bg-[#9b2c44] text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Signing out…" : "Sign out everywhere"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[48px] flex-1 rounded-2xl border border-gold-ink/25 text-sm font-semibold text-night"
        >
          Cancel
        </button>
      </div>
    </Panel>
  );
}

function ShortcutsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mod, setMod] = useState("Ctrl");
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setMod("⌘");
  }, []);
  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Hall Studio shortcuts"
      description="Press ? inside the Hall Studio to see these at any time."
    >
      <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
        {SHORTCUTS(mod).map(({ group, items }) => (
          <div key={group}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
              {group}
            </p>
            <ul className="space-y-1.5">
              {items.map(([keys, what]) => (
                <li
                  key={what}
                  className="flex items-center justify-between gap-3 text-[13px] text-label-2"
                >
                  <span>{what}</span>
                  <Keys keys={keys} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function InstallSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [platform, setPlatform] = useState<
    "installed" | "ios" | "android" | "desktop"
  >("desktop");
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ua = navigator.userAgent;
    setPlatform(
      standalone
        ? "installed"
        : /iPad|iPhone|iPod/.test(ua) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
          ? "ios"
          : /Android/.test(ua)
            ? "android"
            : "desktop"
    );
  }, [open]);

  const steps: Record<typeof platform, string[]> = {
    installed: [],
    ios: [
      "Open Àríyá in Safari.",
      "Tap the Share button.",
      "Choose Add to Home Screen, then Add.",
    ],
    android: [
      "Open Àríyá in Chrome.",
      "Tap the ⋮ menu.",
      "Choose Install app (or Add to Home screen).",
    ],
    desktop: [
      "Open Àríyá in Chrome or Edge.",
      "Click the install icon at the right of the address bar.",
      "Choose Install. Àríyá opens in its own window.",
    ],
  };

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Install Àríyá"
      description="It opens full screen from its own icon, with notifications and a launch screen."
    >
      {platform === "installed" ? (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-600/10 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Icon name="check_circle" size={18} />
          You&apos;re using the installed app.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {steps[platform].map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 text-sm text-night"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-burgundy font-display text-sm text-champagne">
                {i + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
