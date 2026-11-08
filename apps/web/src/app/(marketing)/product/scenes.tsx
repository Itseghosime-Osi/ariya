"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EntrySeal } from "@/features/invitations/components/EntrySeal";
import { THEME_PALETTES } from "@/features/invitations/design";
import { seg, useScene } from "./use-scene";

const PALETTE = THEME_PALETTES.royal_gold;
const at = (a: number, d = 0.12) =>
  ({ "--a": a, "--d": d }) as React.CSSProperties;

/* ---------- II. The card ---------- */

const LAYERS = [
  ["Paper and foil", 0.04],
  ["Headline", 0.18],
  ["Divider", 0.3],
  ["Frame", 0.4],
  ["Picture", 0.52],
  ["Entry seal", 0.68],
] as const;

export function CardScene() {
  const ref = useScene<HTMLElement>();
  return (
    <section
      ref={ref}
      className="ps-scene"
      aria-label="Designing an invitation"
    >
      <div className="ps-sticky">
        <div className="wrap ps-grid">
          <div className="ps-copy">
            <span className="caps">Invitations</span>
            <h2>
              Design it <em className="foil-text">your way.</em>
            </h2>
            <p>
              Start in Simple mode, or go Pro with a free canvas. Import a card
              you already have, then add words, shapes, pictures and a seal that
              carries each guest&rsquo;s own entry code.
            </p>
            <ol className="ps-layers" aria-hidden="true">
              {LAYERS.map(([name, a]) => (
                <li key={name} className="ps-in" style={at(a)}>
                  <i /> {name}
                </li>
              ))}
            </ol>
          </div>
          <div className="ps-stage" aria-hidden="true">
            <div className="ps-card">
              <div className="ps-in ps-paper" style={at(0.04, 0.1)} />
              <div className="ps-in ps-frame" style={at(0.4)} />
              <p className="ps-in ps-head" style={at(0.18)}>
                Chidinma <span>&amp;</span> Tunde
              </p>
              <p className="ps-in ps-rule" style={at(0.3)}>
                <i /> ✦ <i />
              </p>
              <div className="ps-in ps-photo" style={at(0.52)} />
              <p className="ps-in ps-date" style={at(0.6)}>
                Saturday, 12 December 2026
              </p>
              <div className="ps-in ps-seal" style={at(0.68)}>
                <EntrySeal value="ARY-7K2M-99NP" palette={PALETTE} plate />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- III. The send ---------- */

const SEND = [
  ["Adaeze Okonkwo", "adaeze@example.com"],
  ["Uncle Dayo", "dayo@example.com"],
  ["Bisi Adebayo", "bisi@example.com"],
  ["Emeka & Ifeoma Okafor", "emeka@example.com"],
  ["Tolu Bankole", "tolu@example.com"],
] as const;

export function SendScene() {
  const [ticked, setTicked] = useState<Set<number>>(() => new Set([0, 1, 2]));
  const [sent, setSent] = useState<Set<number>>(new Set());
  const pending = [...ticked].filter((i) => !sent.has(i));

  function toggle(i: number) {
    if (sent.has(i)) return;
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <section className="sec ps-send" aria-labelledby="sendTitle">
      <div className="wrap ps-grid">
        <div className="ps-copy">
          <span className="caps">Links and email</span>
          <h2 id="sendTitle">
            Tick the guests. <em>Send.</em>
          </h2>
          <p>
            Email goes out in one go, ten guests at a time, each with their own
            personal link. For WhatsApp or text, copy a guest&rsquo;s link and
            paste it into the chat. (Sending those for you is not built yet.)
          </p>
        </div>
        <div
          className="ps-panel"
          role="group"
          aria-label="Sample guests to invite"
        >
          <ul>
            {SEND.map(([name, email], i) => (
              <li key={name} className={sent.has(i) ? "is-sent" : undefined}>
                <label>
                  <input
                    type="checkbox"
                    checked={ticked.has(i)}
                    disabled={sent.has(i)}
                    onChange={() => toggle(i)}
                  />
                  <span>
                    <b>{name}</b>
                    <small>{email}</small>
                  </span>
                </label>
                <em className={sent.has(i) ? "pill yes" : "pill wait"}>
                  {sent.has(i) ? "Sent" : "Not invited"}
                </em>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-wine"
            disabled={pending.length === 0}
            onClick={() => setSent((s) => new Set([...s, ...pending]))}
          >
            {pending.length === 0
              ? "Nothing to send"
              : `Send ${pending.length} invitation${pending.length === 1 ? "" : "s"} by email`}
          </button>
          <p className="ps-note">
            A sample: nothing is sent.{" "}
            <button type="button" onClick={() => setSent(new Set())}>
              Start again
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- IV. The replies ---------- */

export function RepliesScene() {
  const [n, setN] = useState({ yes: 0, no: 0 });
  const ref = useScene<HTMLElement>((p) => {
    const yes = Math.round(seg(p, 0.06, 0.86) * 62);
    const no = Math.round(seg(p, 0.25, 0.86) * 9);
    setN((s) => (s.yes === yes && s.no === no ? s : { yes, no }));
  });
  const wait = 100 - n.yes - n.no;
  return (
    <section ref={ref} className="ps-scene" aria-label="Replies arriving">
      <div className="ps-sticky">
        <div className="wrap ps-grid">
          <div className="ps-copy">
            <span className="caps">RSVPs</span>
            <h2>
              Replies arrive.{" "}
              <em className="foil-text">The list updates itself.</em>
            </h2>
            <p>
              A guest opens their link, taps yes or no, and says if a plus-one
              is coming. Your counts move the moment they do, and they get a
              confirmation in writing.
            </p>
            <dl className="ps-counts">
              <div>
                <dt>Coming</dt>
                <dd>{n.yes}</dd>
              </div>
              <div>
                <dt>Awaiting</dt>
                <dd>{wait}</dd>
              </div>
              <div>
                <dt>Declined</dt>
                <dd>{n.no}</dd>
              </div>
            </dl>
          </div>
          <div className="ps-stage" aria-hidden="true">
            <div className="ps-waffle">
              {Array.from({ length: 100 }, (_, i) => (
                <i
                  key={i}
                  className={
                    i < n.yes ? "yes" : i >= 100 - n.no ? "no" : "wait"
                  }
                />
              ))}
            </div>
            <p className="ps-caption">One dot for every percent of the list</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- V. The seats ---------- */

const TABLES = [
  [22, 28],
  [50, 28],
  [78, 28],
  [22, 62],
  [50, 62],
  [78, 62],
] as const;

export function SeatsScene() {
  const [seated, setSeated] = useState(0);
  const ref = useScene<HTMLElement>((p) => {
    const s = Math.round(seg(p, 0.05, 0.9) * 48);
    setSeated((v) => (v === s ? v : s));
  });

  const guests = useMemo(
    () =>
      Array.from({ length: 52 }, (_, i) => {
        const seat = i < 48;
        const t = Math.floor(i / 8);
        const k = i % 8;
        const [cx, cy] = TABLES[Math.min(t, 5)];
        const ang = (k / 8) * Math.PI * 2 - Math.PI / 2;
        return {
          sx: 8 + (i / 51) * 84,
          sy: 90,
          ex: seat ? cx + Math.cos(ang) * 9.5 : 8 + (i / 51) * 84,
          ey: seat ? cy + Math.sin(ang) * 11.5 : 90,
          a: 0.05 + (i / 48) * 0.8,
        };
      }),
    []
  );

  return (
    <section
      ref={ref}
      className="ps-scene"
      aria-label="Seating the confirmed guests"
    >
      <div className="ps-sticky">
        <div className="wrap ps-grid">
          <div className="ps-copy">
            <span className="caps">Seating</span>
            <h2>
              Every yes takes <em className="foil-text">a seat.</em>
            </h2>
            <p>
              Only guests who said yes can be seated, and a table never takes
              more people than it has chairs. Auto-seat fills the room by family
              and side, and you can still move anyone.
            </p>
            <div className="ps-count">
              <b>{seated}</b>
              <span>of 52 confirmed seated</span>
            </div>
            <Link className="btn btn-ghost" href="/documentation/seating">
              How seating works
            </Link>
          </div>
          <div className="ps-stage" aria-hidden="true">
            <div className="ps-hall">
              {TABLES.map(([x, y], i) => (
                <span
                  key={i}
                  className="ps-table"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {i + 1}
                </span>
              ))}
              {guests.map((g, i) => (
                <i
                  key={i}
                  className="ps-guest"
                  style={
                    {
                      "--sx": g.sx,
                      "--sy": g.sy,
                      "--ex": g.ex,
                      "--ey": g.ey,
                      "--a": g.a,
                    } as React.CSSProperties
                  }
                />
              ))}
              <span className="ps-lobby">Not yet seated</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- VII. The helper ---------- */

export function HelperScene() {
  const ref = useScene<HTMLElement>();
  return (
    <section
      ref={ref}
      className="ps-scene ps-scene-short"
      aria-label="An AI proposing a seating plan"
    >
      <div className="ps-sticky">
        <div className="wrap ps-grid">
          <div className="ps-copy">
            <span className="caps">Your own AI</span>
            <h2>
              It proposes. <em className="foil-text">You decide.</em>
            </h2>
            <p>
              Connect Claude or ChatGPT and let it read your lists and draft the
              work. Anything that changes your event waits on your approvals
              desk. It can never send, delete or touch a guest&rsquo;s reply.
            </p>
            <Link className="btn btn-ghost" href="/documentation/connect-ai">
              How the connection works
            </Link>
          </div>
          <div className="ps-stage" aria-hidden="true">
            <div className="ps-chat">
              <p className="ps-in ps-me" style={at(0.08)}>
                Seat the 12 guests who still have no table, families together.
              </p>
              <p className="ps-in ps-ai" style={at(0.28)}>
                I&rsquo;ve drafted a plan. Nothing changes until you approve it.
              </p>
              <div className="ps-in ps-proposal" style={at(0.42)}>
                <small>Proposal</small>
                <b>Seat 12 guests</b>
                <span>12 seated · 0 moved · 0 over capacity</span>
                <div className="ps-actions">
                  <span className="ps-btn-no">Decline</span>
                  <span className="ps-btn-yes">
                    <i className="a">Approve</i>
                    <i className="b">✓ Applied · undo for 7 days</i>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
