"use client";

import React, { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { pluralise } from "@/lib/metrics";
import {
  trackGuestInvitationsAction,
  sendBulkInvitationEmailsAction,
} from "../actions";
import type { InvitationGuest } from "../types";

interface InvitationGuestTrackerProps {
  eventId: string;
  guests: InvitationGuest[];
  eventTitle: string;
}

type Filter = "all" | "uninvited" | "invited";
type Channel = "email" | "whatsapp";

const CHANNELS: { key: Channel; label: string; icon: string }[] = [
  { key: "email", label: "Email", icon: "mail" },
  { key: "whatsapp", label: "WhatsApp", icon: "share" },
];

const EMAIL_BATCH = 10;

const DEFAULT_MESSAGE =
  "Hello {name}! You are invited to {event}. Your personal invitation and RSVP: {link}";

function digits(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

function fillMessage(
  template: string,
  guest: InvitationGuest,
  eventTitle: string,
  origin: string
) {
  return template
    .replaceAll("{name}", guest.name.split(" ")[0] || guest.name)
    .replaceAll("{event}", eventTitle)
    .replaceAll("{link}", `${origin}/i/${guest.rsvpToken}`);
}

/** The guest's WhatsApp chat, with their personal message already written. */
function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`;
}

export function InvitationGuestTracker({
  eventId,
  guests,
  eventTitle,
}: InvitationGuestTrackerProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<Channel | null>(null);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [queue, setQueue] = useState<{ ids: string[]; at: number } | null>(
    null
  );
  const [notice, setNotice] = useState<{
    tone: "ok" | "bad";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const byId = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const invited = guests.filter((g) => g.invitedAt).length;
  const pct = guests.length ? Math.round((invited / guests.length) * 100) : 0;

  const counts = {
    all: guests.length,
    uninvited: guests.length - invited,
    invited,
  };
  const shown = guests.filter((g) =>
    filter === "uninvited"
      ? !g.invitedAt
      : filter === "invited"
        ? !!g.invitedAt
        : true
  );

  const chosen = guests.filter((g) => selected.has(g.id));
  const reach = {
    email: chosen.filter((g) => g.email).length,
    whatsapp: chosen.filter((g) => g.phone).length,
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectUnsent = () =>
    setSelected(new Set(guests.filter((g) => !g.invitedAt).map((g) => g.id)));
  const allShownSelected =
    shown.length > 0 && shown.every((g) => selected.has(g.id));

  const markInvited = (ids: string[]) =>
    startTransition(async () => {
      const res = await trackGuestInvitationsAction(eventId, ids);
      if (res.error) setNotice({ tone: "bad", text: res.error });
    });

  const copyLinks = async (list: InvitationGuest[]) => {
    const text = list
      .map((g) => `${g.name}: ${origin}/i/${g.rsvpToken}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    markInvited(list.map((g) => g.id));
    setNotice({
      tone: "ok",
      text: `${pluralise(list.length, "link")} copied.`,
    });
  };

  const [progress, setProgress] = useState<{ done: number; of: number } | null>(
    null
  );

  const sendEmails = () => {
    const ids = chosen.filter((g) => g.email).map((g) => g.id);
    setNotice(null);
    startTransition(async () => {
      // A long list goes as small batches so no single request runs long.
      let sent = 0;
      const failed: { guestId: string; error: string }[] = [];
      for (let i = 0; i < ids.length; i += EMAIL_BATCH) {
        setProgress({ done: i, of: ids.length });
        const res = await sendBulkInvitationEmailsAction(
          eventId,
          ids.slice(i, i + EMAIL_BATCH)
        );
        sent += res.sent;
        failed.push(...res.failed);
        if (res.error) {
          failed.push({ guestId: "", error: res.error });
          break;
        }
        // The same problem would fail every remaining batch; stop and say so.
        if (res.failed.length === ids.slice(i, i + EMAIL_BATCH).length) break;
      }
      setProgress(null);
      setSheet(null);
      const missed = failed.length;
      setNotice({
        tone: missed ? "bad" : "ok",
        text: missed
          ? `${sent} sent, ${missed} not sent. ${failed[0].error}`
          : `${pluralise(sent, "email")} sent.`,
      });
      if (!missed) setSelected(new Set());
    });
  };

  const startQueue = () => {
    const ids = chosen.filter((g) => g.phone).map((g) => g.id);
    setQueue({ ids, at: 0 });
    setSheet("whatsapp");
  };

  const current = queue ? byId.get(queue.ids[queue.at]) : undefined;
  const advance = () =>
    setQueue((q) => {
      if (!q) return q;
      if (q.at + 1 >= q.ids.length) {
        setSheet(null);
        setSelected(new Set());
        setNotice({ tone: "ok", text: "That was the last one." });
        return null;
      }
      return { ...q, at: q.at + 1 };
    });

  const closeSheet = () => {
    setSheet(null);
    setQueue(null);
  };

  return (
    <section aria-labelledby="send-heading" className="space-y-4 pb-28">
      <div className="profile-card relative overflow-hidden rounded-[28px] p-5 sm:p-6">
        <span aria-hidden="true" className="profile-card__weave" />
        <div className="relative flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f3d98f]">
              Invitation Delivery Tracker
            </p>
            <h2
              id="send-heading"
              className="mt-1 flex items-baseline gap-2 font-display text-[#fff6dc]"
            >
              <span className="text-5xl font-semibold leading-none">
                {invited}
              </span>
              <span className="text-xl text-[#f4e8cc]">
                of {guests.length} invited
              </span>
            </h2>
          </div>
          {counts.uninvited > 0 && (
            <button
              type="button"
              onClick={selectUnsent}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] px-5 text-[13px] font-semibold text-night shadow-[0_6px_18px_rgba(212,168,90,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d98f]"
            >
              Select the {counts.uninvited} not sent
            </button>
          )}
        </div>
        <div
          aria-hidden="true"
          className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f6e2ad] to-[#d4a85a] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="relative mt-3 text-[13px] text-[#f4e8cc]">
          Tick the people you want, then choose how to reach them.
        </p>
      </div>

      <div
        role="toolbar"
        aria-label="Filter guests"
        className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <div className="flex gap-2">
          {(
            [
              ["all", "All"],
              ["uninvited", "Not sent"],
              ["invited", "Sent"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                filter === key
                  ? "bg-burgundy text-ivory shadow-sm"
                  : "desk-chip text-burgundy"
              }`}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-2xl border p-3.5 text-[13px] font-semibold ${
            notice.tone === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <Icon
            name={notice.tone === "ok" ? "check_circle" : "error"}
            className="text-base"
          />
          {notice.text}
        </div>
      )}

      <div className="bento-card overflow-hidden">
        <label className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-hairline px-4 text-[13px] font-semibold text-label-2">
          <input
            type="checkbox"
            checked={allShownSelected}
            onChange={() =>
              setSelected((prev) => {
                const next = new Set(prev);
                for (const g of shown) {
                  if (allShownSelected) next.delete(g.id);
                  else next.add(g.id);
                }
                return next;
              })
            }
            className="h-5 w-5 accent-[var(--burgundy)]"
          />
          Select everyone shown
        </label>
        <ul className="max-h-[560px] divide-y divide-hairline overflow-y-auto">
          {shown.map((g) => {
            const on = selected.has(g.id);
            return (
              <li key={g.id}>
                <label
                  className={`flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                    on ? "bg-burgundy/[0.06]" : "hover:bg-white/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(g.id)}
                    aria-label={`Select ${g.name}`}
                    className="h-5 w-5 shrink-0 accent-[var(--burgundy)]"
                  />
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] text-sm font-bold text-night">
                    {g.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-night">
                        {g.name}
                      </span>
                      {g.isVip && (
                        <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[11px] font-bold text-gold-ink">
                          VIP
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-label-2">
                      <span
                        className={`inline-flex items-center gap-1 ${g.email ? "" : "opacity-50"}`}
                      >
                        <Icon name="mail" className="text-sm" />
                        {g.email ?? "No email"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 ${g.phone ? "" : "opacity-50"}`}
                      >
                        <Icon name="phone" className="text-sm" />
                        {g.phone ?? "No phone"}
                      </span>
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      g.invitedAt
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-gold/20 text-gold-ink"
                    }`}
                  >
                    {g.invitedAt ? "Sent" : "Not sent"}
                  </span>
                </label>
              </li>
            );
          })}
          {shown.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-label-2">
              No guests here.
            </li>
          )}
        </ul>
      </div>

      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Send to the selected guests"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 mx-auto max-w-3xl rounded-[28px] border border-[#f6e2ad]/25 bg-night/95 p-3 text-ivory shadow-[0_20px_50px_-12px_rgba(28,7,13,0.7)] backdrop-blur sm:bottom-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto pl-2 text-[14px] font-semibold">
              {selected.size} selected
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ml-3 min-h-11 text-[13px] font-semibold text-[#f3d98f] underline underline-offset-4"
              >
                Clear
              </button>
            </p>
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                type="button"
                disabled={reach[c.key] === 0}
                onClick={() =>
                  c.key === "email" ? setSheet("email") : startQueue()
                }
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] px-4 text-[13px] font-semibold text-night disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d98f]"
              >
                <Icon name={c.icon as never} className="text-base" />
                {c.label} ({reach[c.key]})
              </button>
            ))}
            <button
              type="button"
              onClick={() => void copyLinks(chosen)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#f6e2ad]/40 px-4 text-[13px] font-semibold text-[#f6e2ad] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d98f]"
            >
              <Icon name="copy" className="text-base" />
              Copy links
            </button>
          </div>
        </div>
      )}

      {sheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send invitations"
          className="fixed inset-0 z-40 flex items-end justify-center bg-night/60 p-0 sm:items-center sm:p-6"
        >
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-ivory p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
                  {sheet === "email" || !queue
                    ? "Send by email"
                    : `WhatsApp · ${queue.at + 1} of ${queue.ids.length}`}
                </p>
                <h3 className="font-display text-2xl font-bold text-night">
                  {sheet === "email"
                    ? `Email ${pluralise(reach.email, "guest")}`
                    : (current?.name ?? "Done")}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Close"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-label-2 hover:bg-black/5"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            {sheet === "email" ? (
              <div className="mt-4 space-y-4">
                <p className="rounded-2xl desk-field p-4 text-[14px] leading-relaxed text-night">
                  Each guest gets an email from Àríyá with the celebration
                  details and their own RSVP link. They are marked Sent as it
                  goes.
                </p>
                {chosen.length > reach.email && (
                  <p className="text-[13px] text-gold-ink">
                    {pluralise(chosen.length - reach.email, "selected guest")}{" "}
                    have no email address and will be skipped.
                  </p>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={sendEmails}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-burgundy px-6 text-[15px] font-semibold text-ivory shadow-sm hover:bg-night disabled:opacity-60"
                >
                  <Icon
                    name={isPending ? "refresh" : "outgoing_mail"}
                    className="text-lg"
                  />
                  {isPending
                    ? progress
                      ? `Sending ${Math.min(progress.done + EMAIL_BATCH, progress.of)} of ${progress.of}`
                      : "Sending"
                    : `Send ${pluralise(reach.email, "email")}`}
                </button>
              </div>
            ) : (
              current && (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
                      Message (the same for everyone)
                    </span>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="desk-field w-full rounded-2xl p-3.5 text-base text-night outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                    />
                  </label>
                  <p className="text-[12px] text-label-2">
                    {"{name}"}, {"{event}"} and {"{link}"} are filled in for
                    each guest.
                  </p>
                  <div className="rounded-2xl bg-night/[0.04] p-3.5 text-[14px] leading-relaxed text-night">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-label-2">
                      What {current.name.split(" ")[0]} will see
                    </span>
                    {fillMessage(message, current, eventTitle, origin)}
                  </div>
                  <p className="text-[13px] text-label-2">
                    WhatsApp opens with this ready to go. Press Send there, then
                    come back for the next guest.
                  </p>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <a
                      href={whatsappUrl(
                        current.phone ?? "",
                        fillMessage(message, current, eventTitle, origin)
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        markInvited([current.id]);
                        advance();
                      }}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] px-5 text-[15px] font-semibold text-night shadow-[0_6px_18px_rgba(212,168,90,0.35)]"
                    >
                      <Icon name="share" className="text-lg" />
                      Open for {current.name.split(" ")[0]}
                    </a>
                    <button
                      type="button"
                      onClick={advance}
                      className="min-h-12 rounded-full px-4 text-[14px] font-semibold text-label-2 hover:bg-black/5"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}
