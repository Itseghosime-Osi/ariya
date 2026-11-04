"use client";

import { useCallback, useRef, useState } from "react";
import {
  InvitationCard,
  PlaceCard,
  WaxSeal,
} from "@/components/site/fine-card";
import {
  SAMPLE_GUESTS,
  SAMPLE_TABLES,
  seatsUsed,
  tableById,
} from "@/lib/site/sample";
import { chime, crack as sealCrack } from "@/lib/site/score";

const GUEST_FIRST_NAME = "Adaeze";

type Phase = {
  cracking: boolean;
  broken: boolean;
  open: boolean;
  placed: boolean;
};

const CLOSED: Phase = {
  cracking: false,
  broken: false,
  open: false,
  placed: false,
};

type Crumb = { s: number; x: number; y: number; r: number };

type Confirmation = {
  name: string;
  table: string;
  used: number;
  cap: number;
};

// Auto-seat the reply: the table they prefer, else the first with room.
function seatFor(party: number, prefer = "t7") {
  const order = [
    prefer,
    ...SAMPLE_TABLES.map((t) => t.id).filter((id) => id !== prefer),
  ];
  for (const id of order) {
    const t = tableById(id);
    if (t && seatsUsed(SAMPLE_GUESTS, id) + party <= t.capacity) {
      return { table: t, used: seatsUsed(SAMPLE_GUESTS, id) + party };
    }
  }
  const fallback = tableById(prefer)!;
  return {
    table: fallback,
    used: seatsUsed(SAMPLE_GUESTS, fallback.id) + party,
  };
}

export function Invitation() {
  const [phase, setPhase] = useState<Phase>(CLOSED);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [choice, setChoice] = useState<"yes" | "no" | "">("");
  const [plusOne, setPlusOne] = useState(false);
  const [plusName, setPlusName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bitsRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      w: number;
      h: number;
      r: number;
      vr: number;
      c: string;
      life: number;
    }>
  >([]);
  const bitsOnRef = useRef(false);

  const burst = useCallback((x: number, y: number) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = canvasRef.current;
    const cx = cv?.getContext("2d");
    if (!cv || !cx) return;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    const cols = ["#f3dca4", "#c9a256", "#fff1c8", "#9a2a45", "#f4efe6"];
    for (let i = 0; i < 150; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const s = 6 + Math.random() * 10;
      bitsRef.current.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        w: 4 + Math.random() * 6,
        h: 3 + Math.random() * 5,
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        c: cols[i % cols.length],
        life: 120 + Math.random() * 60,
      });
    }
    if (!bitsOnRef.current) {
      bitsOnRef.current = true;
      requestAnimationFrame(function step() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
          bitsOnRef.current = false;
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bitsRef.current = bitsRef.current.filter(
          (b) => b.life > 0 && b.y < canvas.height + 40
        );
        for (const b of bitsRef.current) {
          b.vy += 0.3;
          b.vx *= 0.985;
          b.x += b.vx;
          b.y += b.vy;
          b.r += b.vr;
          b.life--;
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.r);
          ctx.globalAlpha = Math.min(1, b.life / 40);
          ctx.fillStyle = b.c;
          ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
          ctx.restore();
        }
        if (bitsRef.current.length) requestAnimationFrame(step);
        else {
          bitsOnRef.current = false;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    }
  }, []);

  // Breaking the seal: the crack draws, the halves fall with a few crumbs,
  // then the flap lifts and the card rises.
  const openEnv = useCallback(() => {
    setPhase((prev) => (prev.cracking ? prev : { ...prev, cracking: true }));
    sealCrack();
    navigator.vibrate?.([10, 30, 22]);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!reduce) {
      const next: Crumb[] = [];
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 40 + Math.random() * 70;
        next.push({
          s: 3 + Math.random() * 6,
          x: Math.cos(a) * d,
          y: Math.sin(a) * d * 0.6 + 40 + Math.random() * 40,
          r: Math.random() * 360,
        });
      }
      setCrumbs(next);
      window.setTimeout(() => setCrumbs([]), 1000);
    }
    window.setTimeout(
      () => setPhase((prev) => ({ ...prev, broken: true })),
      reduce ? 0 : 280
    );
    window.setTimeout(
      () => setPhase((prev) => ({ ...prev, open: true })),
      reduce ? 0 : 700
    );
  }, []);

  const stageRef = useRef<HTMLDivElement | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!choice) {
      setError("Choose accept or decline to send your reply.");
      return;
    }
    if (choice === "yes" && plusOne && !plusName.trim()) {
      setError("Add your plus-one's name, or untick the plus-one box.");
      return;
    }
    setError("");
    setSending(true);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.setTimeout(
      () => {
        setSending(false);
        if (choice === "yes") {
          const party = plusOne ? 2 : 1;
          const { table, used } = seatFor(party);
          const first = plusName.trim().split(" ")[0];
          const name = first
            ? `${GUEST_FIRST_NAME} & ${first}`
            : GUEST_FIRST_NAME;
          setConfirmed({ name, table: table.name, used, cap: table.capacity });
          setResult(
            `<h4>You're confirmed, ${GUEST_FIRST_NAME}.</h4><p>${table.name}, now ${used} of ${table.capacity} seats filled. This sample reply stays in your browser tab; no confirmation email is sent.</p>`
          );
          const wasOpen = phase.open;
          openEnv();
          window.setTimeout(
            () => setPhase((prev) => ({ ...prev, placed: true })),
            reduce ? 0 : wasOpen ? 500 : 1600
          );
          const btn = document.getElementById("sendBtn");
          const rb = btn?.getBoundingClientRect();
          if (rb) burst(rb.left + rb.width / 2, rb.top);
          navigator.vibrate?.([18, 40, 18]);
          chime();
        } else {
          setConfirmed(null);
          setPhase((prev) => ({ ...prev, placed: false }));
          setResult(
            "<h4>Thank you for letting them know.</h4><p>This sample reply stays in your browser tab; no message or email is sent.</p>"
          );
        }
      },
      reduce ? 0 : 350
    );
  }

  function reset() {
    setPhase(CLOSED);
    setChoice("");
    setPlusOne(false);
    setPlusName("");
    setResult(null);
    setError("");
    setConfirmed(null);
    setSending(false);
  }

  const stageClass = [
    "inv-stage",
    phase.cracking && "cracking",
    phase.broken && "broken",
    phase.open && "open",
    phase.placed && "placed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="c-invite" id="invitation" aria-labelledby="invTitle">
      <div className="wrap">
        <div className="inv-head reveal">
          <span className="caps">Every guest gets their own</span>
          <h2 id="invTitle">
            Open your <em className="foil-text">invitation.</em>
          </h2>
        </div>
        <div className="inv-grid">
          <div>
            <div className={stageClass} ref={stageRef}>
              <div className="env">
                <div className="env-back" />
                <div className="env-front">
                  <p>Adaeze Okonkwo</p>
                </div>
                <div className="env-flap" aria-hidden="true">
                  <i />
                  <i />
                </div>
              </div>
              <div className="card-wrap">
                <div className="flip">
                  <div className="face front">
                    <InvitationCard
                      variant="auto"
                      guest="Adaeze Okonkwo"
                      noCotd
                      label="Invitation for Adaeze Okonkwo to Chidinma and Tunde's wedding, Saturday 12 December 2026, The Grand Pavilion, Victoria Island, Lagos"
                    />
                  </div>
                  <div className="face back">
                    {confirmed ? (
                      <PlaceCard
                        variant="ivory"
                        name={confirmed.name}
                        table={confirmed.table}
                        used={confirmed.used}
                        cap={confirmed.cap}
                        initials="C T"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                className="seal"
                type="button"
                aria-label="CT — Break the seal and open the invitation"
                onClick={openEnv}
              >
                <WaxSeal initials="C T" breakable />
              </button>
              {crumbs.map((c, i) => (
                <i
                  key={i}
                  className="crumb"
                  style={
                    {
                      "--s": `${c.s.toFixed(1)}px`,
                      "--x": `${c.x.toFixed(0)}px`,
                      "--y": `${c.y.toFixed(0)}px`,
                      "--r": `${c.r.toFixed(0)}deg`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
            <p className="seal-hint">
              <b>Break the seal</b>Tap it to open your invitation
            </p>
          </div>

          <form
            className="rsvp reveal"
            id="rsvpForm"
            onSubmit={onSubmit}
            noValidate
          >
            <div>
              <h3>Hello, Adaeze.</h3>
              <p className="when">
                Saturday 12 December 2026 · The Grand Pavilion, Lagos
              </p>
            </div>
            <fieldset>
              <legend>Will you attend?</legend>
              <div className="choice">
                <label>
                  <input
                    type="radio"
                    name="resp"
                    value="yes"
                    checked={choice === "yes"}
                    onChange={() => setChoice("yes")}
                  />{" "}
                  Joyfully accept
                </label>
                <label>
                  <input
                    type="radio"
                    name="resp"
                    value="no"
                    checked={choice === "no"}
                    onChange={() => setChoice("no")}
                  />{" "}
                  Regretfully decline
                </label>
              </div>
            </fieldset>
            <label className="check">
              <input
                type="checkbox"
                checked={plusOne}
                onChange={(e) => setPlusOne(e.target.checked)}
              />{" "}
              I&rsquo;m bringing my plus-one
            </label>
            {plusOne ? (
              <div className="field">
                <label htmlFor="plusName">Plus-one&rsquo;s name</label>
                <input
                  className="input"
                  id="plusName"
                  autoComplete="off"
                  value={plusName}
                  onChange={(e) => setPlusName(e.target.value)}
                />
              </div>
            ) : null}
            <p className="error-text" role="alert">
              {error}
            </p>
            <button
              className="btn btn-wine"
              type="submit"
              id="sendBtn"
              disabled={sending}
            >
              {sending
                ? "Sending…"
                : result
                  ? "Update my reply"
                  : "Send my reply"}
            </button>
            {result ? (
              <div
                className="result"
                tabIndex={-1}
                aria-live="polite"
                dangerouslySetInnerHTML={{ __html: result }}
              />
            ) : null}
            <p className="demo-note">
              Demo with a sample guest · nothing is sent ·{" "}
              <button
                className="link-btn"
                type="button"
                style={{ minHeight: 0, fontWeight: 600 }}
                onClick={reset}
              >
                Start again
              </button>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

// Gold confetti for a yes: a fixed overlay, drawn straight to the canvas.
export function BurstCanvas() {
  return <canvas id="burst" aria-hidden="true" />;
}
