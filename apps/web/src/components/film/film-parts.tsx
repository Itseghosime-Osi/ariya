// The archive's film, as React. Class names, ids and structure are kept
// exactly as public/site/index.html had them: archive.css is written against
// this DOM, and the engine looks elements up by id.
//
// Nodes the engine writes into (text, style, class) render empty here, so a
// React re-render can never overwrite a frame that is already on screen.

import Link from "next/link";
import type { FilmStatus } from "./engine";

export function FilmStage() {
  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      {/* The scene's canvas is owned by the document, not by this render; the
          engine adopts it into this slot so a re-mount reuses the same one. */}
      <div id="glHost" aria-hidden="true" />
    </>
  );
}

export function Gate({ status }: { status: FilmStatus }) {
  return (
    <div
      className="gate"
      id="gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gateTitle"
      hidden={status.entered ? true : undefined}
    >
      <div className="inner">
        <span className="mark">Àríyá presents</span>
        <h1 id="gateTitle">
          The <em>Yes</em>
        </h1>
        <p className="value">One invitation for every guest.</p>
        <fieldset className="hue" id="hue">
          <legend className="sr-only">Choose the colour of the day</legend>
          <label>
            <input type="radio" name="hue" value="burgundy" defaultChecked />
            <span
              className="sw"
              style={
                { "--c1": "#7a1730", "--c2": "#2a0610" } as React.CSSProperties
              }
              aria-hidden="true"
            />
            <span className="nm">Burgundy</span>
          </label>
          <label>
            <input type="radio" name="hue" value="blue" />
            <span
              className="sw"
              style={
                { "--c1": "#2a4aa8", "--c2": "#081638" } as React.CSSProperties
              }
              aria-hidden="true"
            />
            <span className="nm">Sapphire blue</span>
          </label>
          <label>
            <input type="radio" name="hue" value="green" />
            <span
              className="sw"
              style={
                { "--c1": "#4a8a68", "--c2": "#0e2a1c" } as React.CSSProperties
              }
              aria-hidden="true"
            />
            <span className="nm">Champagne green</span>
          </label>
        </fieldset>
        <div className="load mono" aria-live="polite">
          <i>
            <b id="loadBar" />
          </i>
          <span id="loadTxt" />
        </div>
        <div className="actions">
          <button
            className="btn gold enter"
            id="enterSound"
            type="button"
            disabled
          >
            <span className="ring" aria-hidden="true" />
            Enter the wedding
          </button>
          <button className="quiet" id="enterQuiet" type="button">
            Enter in silence
          </button>
        </div>
        <div className="how" id="how" hidden>
          <p className="mono how-q" id="howQ">
            How would you like to see it?
          </p>
          <div className="how-opts" role="group" aria-labelledby="howQ">
            <button className="btn gold" id="howScroll" type="button">
              Scroll
            </button>
            <button className="btn" id="howWatch" type="button">
              <span className="play-ico" aria-hidden="true" />
              Watch
            </button>
          </div>
          <p className="how-note">
            Watch plays itself in <span id="howMins" />. Scroll lets you set the
            pace.
          </p>
        </div>
      </div>
    </div>
  );
}

export function FilmNav() {
  return (
    <header className="nav" id="nav">
      <a
        className="wordmark"
        href="#top"
        id="home"
        aria-label="Àríyá, back to the start"
      >
        Àríyá
      </a>
      <div className="where mono" aria-live="off">
        <span>Chapter</span>
        <b id="whereNo" />
        <span id="whereName" />
      </div>
      <div className="right">
        <Link className="btn gold small" href="/events">
          Start planning
        </Link>
        <button
          className="icon-btn"
          id="menuBtn"
          type="button"
          data-cm-open
          data-cm-label
        >
          Menu
        </button>
      </div>
    </header>
  );
}

export function Opening({ status }: { status: FilmStatus }) {
  return (
    <>
      <div className="opening" id="opening" aria-hidden="true">
        <p className="slate mono" id="slate" />
        <p className="words" id="words" />
        <svg
          className="thread"
          id="thread"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
        >
          <path
            id="threadPath"
            d="M520 330 C 600 300, 700 250, 760 260 S 900 330, 1040 300"
          />
        </svg>
      </div>
      <div className="cc" id="cc" aria-live="polite">
        <span className="who" id="ccWho" />
        <span className="line" id="ccLine" />
      </div>
      <div className="obar" id="obar" role="group" aria-label="Film controls">
        <button
          type="button"
          id="obPlay"
          aria-pressed={status.playing ? "true" : "false"}
          hidden={status.how !== "watch"}
        >
          <span className="ico" aria-hidden="true" />
          <span className="lbl" />
        </button>
        <span className="speed-wrap" id="obSpeedWrap" hidden>
          <button
            type="button"
            id="obSpeed"
            aria-expanded="false"
            aria-controls="obSpeedPanel"
            aria-label="Playback speed"
          >
            <span className="val">1×</span>
          </button>
          <div className="speed-panel" id="obSpeedPanel" hidden>
            <label htmlFor="obRate" className="speed-l">
              Speed
            </label>
            <input
              id="obRate"
              type="range"
              min="1"
              max="2"
              step="0.05"
              defaultValue="1"
              aria-valuetext="1 times"
            />
            <div className="speed-stops">
              {[1, 1.25, 1.5, 1.75, 2].map((r) => (
                <button key={r} type="button" data-rate={r}>
                  {r}×
                </button>
              ))}
            </div>
          </div>
        </span>
        <button
          type="button"
          id="soundBtn"
          aria-label="Sound"
          aria-pressed={status.soundOn ? "true" : "false"}
        >
          <svg className="i i-on" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
            <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
          </svg>
          <svg className="i i-off" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
            <path d="M16 9.5l4.5 5M20.5 9.5l-4.5 5" />
          </svg>
          <span className="lbl" />
        </button>
        <button
          type="button"
          id="obCC"
          aria-pressed={status.captions ? "true" : "false"}
          aria-label="Captions"
        >
          CC
        </button>
        <button type="button" id="obReplay" aria-label="Replay">
          <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5a7 7 0 1 1-6.6 4.7" />
            <path d="M5 3.5v5h5" />
          </svg>
          <span className="t">Replay</span>
        </button>
        <button type="button" id="obSkip" aria-label="Skip the opening">
          <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 5l9 7-9 7z" />
            <path d="M18 5v14" />
          </svg>
          <span className="t">
            Skip<span className="long"> the opening</span>
          </span>
        </button>
        <button type="button" id="obMode">
          <svg className="i i-scroll" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="3" width="10" height="18" rx="5" />
            <path d="M12 8v3" />
          </svg>
          <svg className="i i-watch" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M10 9.5v5l4.5-2.5z" />
          </svg>
          <span className="lbl" />
        </button>
      </div>
      <p className="ohint" id="ohint" aria-live="polite" />
    </>
  );
}

/** The count sits inside the old layer; the guests list rides beside it. */
function OldLayerBeats() {
  return (
    <>
      <section
        className="beat low"
        data-in="0.34"
        data-out="0.47"
        aria-label="The noise"
      >
        <span className="no">No. 005 · The noise</span>
        <h2>
          This is how most
          <br />
          weddings get planned.
        </h2>
      </section>

      <section
        className="beat low"
        data-in="0.5"
        data-out="0.6"
        aria-label="The calm"
      >
        <span className="no">No. 007 · The calm</span>
        <h2>
          There is a <em>calmer</em> way.
        </h2>
      </section>
    </>
  );
}

export function InvitationEnvelope() {
  return (
    <div className="envwrap" id="envwrap">
      <div className="env" id="env">
        <div className="env-back" />
        <div className="slot">
          <div
            className="card"
            id="card"
            role="group"
            aria-label="A sample guest invitation"
          >
            <p className="tag">Your personal invitation</p>
            <h3>
              Hello, <span id="who" />.
            </h3>
            <p>
              Chidinma and Tunde are getting married.
              <br />
              Sat 12 Dec 2026 · Victoria Island, Lagos
            </p>
            <label htmlFor="guestName">Sign your name</label>
            <input
              id="guestName"
              type="text"
              defaultValue="Mama Ijeoma"
              maxLength={24}
              autoComplete="off"
            />
            <div className="row">
              <button className="btn solid" id="yes" type="button">
                Yes, I will be there
              </button>
              <button className="btn" id="no" type="button">
                I can&rsquo;t make it
              </button>
            </div>
            <p className="reply" id="reply" aria-live="polite" />
            <p className="link">ariya.ng/r/k7Q2x9mA</p>
          </div>
        </div>
        <div className="env-front">
          <p className="to">
            <small>Hand delivered to</small>
            <span id="toName" />
          </p>
        </div>
        <div className="env-flap" aria-hidden="true">
          <div className="outside">
            <p className="foil">
              Chidinma &amp; Tunde
              <small>12 · 12 · 2026</small>
            </p>
          </div>
          <div className="inside" />
        </div>
        <button
          className="seal"
          id="seal"
          type="button"
          aria-label="CT — Break the seal and open the invitation"
        />
        <p className="seal-hint mono">Tap the seal</p>
      </div>
    </div>
  );
}

export function OldLayer() {
  return (
    <div className="layer" id="oldLayer">
      <div className="storm" id="storm" aria-hidden="true" />
      <div className="groupbar" id="groupbar" aria-hidden="true">
        Chidinma &amp; Tunde 2026 · <strong id="unread" /> unread
      </div>
      <OldLayerBeats />

      <div className="flash" id="flash" aria-hidden="true">
        <div className="core" />
        <div className="fire" />
        <i
          className="glint"
          style={
            { left: "38%", top: "34%", "--gs": ".8" } as React.CSSProperties
          }
        />
        <i
          className="glint"
          style={{ left: "64%", top: "56%" } as React.CSSProperties}
        />
        <i
          className="glint"
          style={
            { left: "55%", top: "28%", "--gs": ".55" } as React.CSSProperties
          }
        />
      </div>

      <section
        className="beat low"
        data-in="0.68"
        data-out="0.775"
        aria-label="The invitation"
        style={{
          bottom: "auto",
          top: "max(13vh, calc(env(safe-area-inset-top, 0px) + 84px))",
        }}
      >
        <span className="no">No. 010 · The invitation</span>
        <h2>
          Every guest gets <em>their own.</em>
        </h2>
      </section>

      <InvitationEnvelope />

      <div className="scrim" id="scrim" aria-hidden="true" />

      <section
        className="beat side"
        data-in="0.78"
        data-out="0.89"
        aria-label="The count"
      >
        <div className="count-beat">
          <span className="no">No. 011 · The count</span>
          <h2>
            Know who&rsquo;s coming.
            <br />
            <em>And where they sit.</em>
          </h2>
          <p className="sub">
            Every guest who says yes takes a seat and lights a candle.
          </p>
          <dl className="count">
            <div>
              <dt>Invited</dt>
              <dd>320</dd>
            </div>
            <div>
              <dt>Confirmed</dt>
              <dd id="cConfirmed" />
            </div>
            <div>
              <dt>Seated</dt>
              <dd id="cSeated" />
            </div>
          </dl>
        </div>
      </section>

      <aside className="guests" id="guests" aria-hidden="true">
        <header>
          <span className="mono">Live</span>
          <span className="mono" style={{ color: "var(--mist)" }}>
            Guest list
          </span>
        </header>
        <ol id="guestRows" />
      </aside>

      <section
        className="beat low finale"
        data-in="0.92"
        data-out="1.01"
        aria-label="The dance"
      >
        <span className="no">No. 015 · The dance</span>
        <h2 className="finale-title">
          Now go and <em>dance.</em>
        </h2>
      </section>
    </div>
  );
}

const TOP_STYLE = {
  bottom: "auto",
  top: "max(13vh, calc(env(safe-area-inset-top, 0px) + 84px))",
} as const;

export function NewLayer() {
  return (
    <div className="layer" id="newLayer">
      <section
        className="beat low"
        data-scene="C"
        data-in="0.06"
        data-out="0.46"
        aria-label="The colour"
      >
        <span className="no">No. 003 · The colour</span>
        <h2>
          <span id="hueA" /> and <em id="hueB" />
        </h2>
        <p className="sub">
          The family chooses the aso ebi. Four hundred people will wear it.
        </p>
      </section>
      <section
        className="beat low"
        data-scene="C"
        data-in="0.54"
        data-out="0.96"
        aria-label="The colour, continued"
      >
        <span className="no">No. 003 · The colour</span>
        <h2>
          Lace, gele and <em>coral.</em>
        </h2>
        <p className="sub">Everyone in one colour. Everyone on one list.</p>
      </section>
      <section
        className="beat low"
        data-scene="G"
        data-in="0.06"
        data-out="0.46"
        aria-label="The weave"
      >
        <span className="no">No. 004 · The weave</span>
        <h2>
          Aso-oke, woven <em>by hand.</em>
        </h2>
        <p className="sub">
          Her family&rsquo;s colour, shot with gold. Indigo and white for his.
        </p>
      </section>
      <section
        className="beat low"
        data-scene="G"
        data-in="0.54"
        data-out="0.96"
        aria-label="One roll, one name"
      >
        <span className="no">No. 004 · The weave</span>
        <h2>
          One roll, <em>one name.</em>
        </h2>
        <p className="sub">
          Each roll is tagged for a guest on the list. Mama Ijeoma&rsquo;s is
          tied first.
        </p>
      </section>
      <section
        className="beat low"
        data-scene="W"
        data-in="0.06"
        data-out="0.62"
        aria-label="The doors"
      >
        <span className="no">No. 009 · The doors · Victoria Island</span>
        <h2>
          Four hundred places. <em>One way in.</em>
        </h2>
        <p className="sub">
          The hall is dressed by four. The guests are still deciding.
        </p>
      </section>
      <section
        className="beat low"
        data-scene="E"
        data-in="0.04"
        data-out="0.32"
        aria-label="Mama"
      >
        <span className="no">No. 006 · Mama · Benin City</span>
        <h2>
          Her outfit is ready.
          <br />
          <em>No invitation has come.</em>
        </h2>
      </section>
      <section
        className="beat low phonecap"
        data-scene="E"
        data-in="0.38"
        data-out="0.7"
        aria-label="Mama's voice message"
      >
        <span className="no">Mama Ijeoma · voice message to Tunde</span>
        <p className="prose">
          &ldquo;Tunde, my son. What time should I be ready? &hellip; I
          don&rsquo;t want to disturb you.&rdquo;
        </p>
      </section>
      <section
        className="beat low phonecap"
        data-scene="E"
        data-in="0.76"
        data-out="0.99"
        aria-label="Forgotten"
      >
        <h2>
          In a crowd of names, someone can still <em>feel forgotten.</em>
        </h2>
      </section>
      <section
        className="beat low"
        data-scene="F"
        data-in="0.03"
        data-out="0.3"
        aria-label="Her name"
      >
        <span className="no">No. 008 · Her name · Lagos, late</span>
        <h2>
          &ldquo;She thinks she has to <em>ask.</em>&rdquo;
        </h2>
        <p className="sub">Tunde finds her in the list.</p>
      </section>
      <section
        className="beat low"
        data-scene="F"
        data-in="0.8"
        data-out="0.99"
        aria-label="Her own invitation"
      >
        <h2>
          Something with <em>her name</em> on it.
        </h2>
      </section>
      <section
        className="beat low"
        data-scene="J"
        data-in="0.04"
        data-out="0.24"
        aria-label="Getting ready"
      >
        <span className="no">No. 012 · Getting ready</span>
        <h2>
          Shoes on the lamp. <em>Gele already tied.</em>
        </h2>
        <p className="sub">
          Everything she will wear, laid out in the order she will need it.
        </p>
      </section>
      <section
        className="beat low"
        data-scene="J"
        data-in="0.66"
        data-out="0.97"
        aria-label="Ready"
      >
        <span className="no">No. 012 · Getting ready</span>
        <h2>
          Ready by <em>noon.</em>
        </h2>
        <p className="sub">Her phone has not stopped buzzing since six.</p>
      </section>
      <section
        className="beat low"
        data-scene="H"
        data-in="0.05"
        data-out="0.45"
        aria-label="The morning"
      >
        <span className="no">No. 013 · The morning</span>
        <h2>
          Four hundred places, <em>set by name.</em>
        </h2>
        <p className="sub">
          Gold, glass and candlelight. Every card written from the same list.
        </p>
      </section>
      <section
        className="beat low"
        data-scene="H"
        data-in="0.55"
        data-out="0.96"
        aria-label="Where to sit"
      >
        <span className="no">No. 013 · The morning</span>
        <h2>
          Nobody has to wonder <em>where to sit.</em>
        </h2>
        <p className="sub">Seating is planned before the doors open.</p>
      </section>
      <section
        className="beat low"
        data-scene="T"
        data-in="0.04"
        data-out="0.44"
        aria-label="The place kept"
        style={TOP_STYLE}
      >
        <span className="no">No. 014 · The place kept</span>
        <h2>
          Mama Ijeoma. <em>Table 1.</em>
        </h2>
        <p className="sub">Guests say yes. The couple choose where they sit.</p>
      </section>
      <section
        className="beat low"
        data-scene="T"
        data-in="0.52"
        data-out="0.98"
        aria-label="I kept your place"
      >
        <span className="no">Tunde</span>
        <h2>
          &ldquo;I kept your <em>place.</em>&rdquo;
        </h2>
        <p className="sub">
          She always kept a plate for him. Today he kept a chair for her.
        </p>
      </section>

      <div className="panel" id="panel">
        <div className="p-head">
          <b>Àríyá</b>
          <span>Chidinma &amp; Tunde · 12 Dec 2026</span>
        </div>
        <p className="p-label">Guests</p>
        <div className="p-search">
          <span className="ico" aria-hidden="true">
            ⌕
          </span>
          <span id="pQuery" />
          <i className="caret" />
        </div>
        <div className="p-row" id="pRow">
          <div>
            <b>Mama Ijeoma</b>
            <small>Benin City · by text message</small>
          </div>
          <span className="pill wait" id="pPill" />
        </div>
        <div className="p-act">
          <button className="p-btn" id="pBtn" type="button">
            Send her invitation
          </button>
        </div>
        <p className="p-note" id="pNote" />
      </div>

      <section
        className="beat low"
        data-scene="D"
        data-in="0.04"
        data-out="0.3"
        aria-label="The send-off"
      >
        <span className="no">No. 016 · The send-off</span>
        <h2>
          When the hall goes quiet,
          <br />
          <em>the sky stays lit.</em>
        </h2>
      </section>
      <section
        className="beat low"
        data-scene="D"
        data-in="0.33"
        data-out="0.6"
        aria-label="The send-off, continued"
      >
        <span className="no">No. 016 · The send-off</span>
        <p className="prose">
          A lantern for every yes. Four hundred of them, rising over the lagoon.
        </p>
      </section>
      <section
        className="beat low finale"
        data-scene="D"
        data-in="0.8"
        data-out="1.01"
        aria-label="The end"
      >
        <h2 className="finale-title">
          Plan your <em>àríyá.</em>
        </h2>
        <div className="row">
          <Link className="btn gold" href="/events">
            Start planning
          </Link>
          <Link className="btn" href="/about">
            About Àríyá
          </Link>
          <button className="btn" id="replay" type="button">
            Watch again
          </button>
        </div>
      </section>
    </div>
  );
}

export function FilmChrome() {
  return (
    <>
      <div className="foot-ui" id="footUi" aria-hidden="true">
        <span className="scrollcue mono" id="scrollcue">
          <i />
          Scroll
        </span>
        <a
          className="finder mono"
          href="/about"
          style={{ pointerEvents: "auto", color: "var(--mist)" }}
        >
          About Àríyá
        </a>
      </div>
      <div className="progress" aria-hidden="true">
        <b id="bar" />
      </div>
      <nav className="rail" id="rail" aria-label="Chapters">
        <ol id="railList" />
      </nav>
      <div className="track" id="track">
        <a id="top" />
      </div>
      <canvas id="confetti" aria-hidden="true" />
    </>
  );
}

const PROOFS: ReadonlyArray<readonly [string, string]> = [
  [
    "One link per guest",
    "Every guest gets their own invitation by text message or email, with their name on it. No group chat.",
  ],
  [
    "Replies arrive by themselves",
    "Yes, no and plus-ones land in one list, with a live headcount for the couple, the planner and the caterer.",
  ],
  [
    "Seat with care",
    "You choose the tables. Guests see their seat on the day, and Mama gets Table 1.",
  ],
];

const PEEK: ReadonlyArray<readonly [string, string, string, string]> = [
  ["Mama Ijeoma", "Table 1", "Confirmed", "yes"],
  ["Aunty Bisi + 4", "Table 3", "Confirmed", "yes"],
  ["Mr & Mrs Okafor", "Table 5", "Confirmed", "yes"],
  ["Femi Adeyemi", "—", "Waiting", "wait"],
  ["Tolu Bankole", "—", "Can't come", "no"],
];

export function FilmClose() {
  return (
    <main className="biz" id="biz">
      <section className="sec close" id="start" aria-labelledby="sTitle">
        <div className="wrap">
          <p className="label mono">
            <b>Àríyá</b>
            <span>For Nigerian weddings, introductions and owambes</span>
          </p>
          <h2 className="statement" id="sTitle">
            That was one wedding. <em>Here is how Àríyá runs yours.</em>
          </h2>
          <div className="close-grid">
            <ol className="proofs">
              {PROOFS.map(([title, body]) => (
                <li key={title}>
                  <b>{title}</b>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
            <figure
              className="peek"
              aria-label="A preview of the planner, on sample data"
            >
              <div className="peek-head">
                <b>Àríyá</b>
                <span>Chidinma &amp; Tunde · Sat 12 Dec 2026</span>
              </div>
              <dl className="peek-count">
                <div>
                  <dt>Invited</dt>
                  <dd>320</dd>
                </div>
                <div>
                  <dt>Confirmed</dt>
                  <dd>241</dd>
                </div>
                <div>
                  <dt>Seated</dt>
                  <dd>218</dd>
                </div>
              </dl>
              <ul className="peek-rows">
                {PEEK.map(([name, table, state, kind]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <em>{table}</em>
                    <i className={kind}>{state}</i>
                  </li>
                ))}
              </ul>
              <figcaption>Sample wedding · demo data</figcaption>
            </figure>
          </div>
          <div className="close-cta">
            <Link className="btn gold" href="/events">
              Start planning
            </Link>
            <Link className="btn" href="/rsvp?g=k701Qx">
              Try a personal invitation
            </Link>
            <Link className="quiet-link" href="/pricing">
              Pricing: free for small events, ₦50,000 per celebration{" "}
              <small>(per event)</small>
            </Link>
          </div>
        </div>
      </section>
      <footer className="foot">
        <div className="wrap">
          <Link className="wordmark" href="/about">
            Àríyá
          </Link>
          <nav aria-label="Footer">
            <Link href="/about">About</Link>
            <Link href="/product">What we do</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/documentation">Docs</Link>
            <Link href="/events">Demo planner</Link>
          </nav>
          <span>
            Àríyá (ah-ree-YAH): merriment, in Yoruba · Tech4Youth Edo · Project
            36 prototype
          </span>
        </div>
      </footer>
    </main>
  );
}
