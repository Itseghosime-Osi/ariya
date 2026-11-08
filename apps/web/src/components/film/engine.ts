// The film's engine: the scroll story, the gate, the envelope, the panel and
// the watch/scroll handoff. Ported from the archive's
// public/site/assets/the-yes-controls.*.js, which drove the same DOM through
// getElementById and per-frame style writes.
//
// Per-frame work stays imperative — React owns the markup, this owns the
// frame — so nothing here goes through state except the handful of switches
// React has to see (see FilmStatus).

import {
  bump,
  chaptersOf,
  clamp,
  createJsMap,
  GUEST_ROWS,
  HUES,
  MESSAGES,
  OPEN_LINES,
  OPEN_SFX,
  OPEN_SLATES,
  OPEN_WORDS,
  PRO,
  seeded,
  seg,
  smooth,
  type ModeName,
  type SceneState,
  type StoryMap,
} from "./story";
import { sceneHost } from "@/lib/site/scene-host";

/** The switches React renders from; everything else is written per frame. */
export interface FilmStatus {
  entered: boolean;
  choosing: boolean;
  how: "scroll" | "watch";
  playing: boolean;
  captions: boolean;
  soundOn: boolean;
  chapter: number;
  envelopeOpen: boolean;
}

export interface FilmEngineOptions {
  root: HTMLElement;
  embed?: "hero" | "hall" | null;
  velvet: string;
  reduceMotion: boolean;
  onStatus: (status: FilmStatus) => void;
  /** The scene plugs in here: (story p, seconds since mount). */
  onRender?: (p: number, t: number) => void;
  onLoadEngine?: (map: StoryMap) => void;
  onChime?: () => void;
  onClock?: () => number | null;
  onWaiting?: () => boolean;
  onSeek?: (t: number) => void;
  onSuspend?: (held: boolean) => void;
  onLoop?: (loop: boolean) => void;
  onRestart?: () => void;
  /** Watch speed changed (1 to 2): the song follows it. */
  onRate?: (rate: number) => void;
  onSfx?: (name: string) => void;
  onAmbience?: (kind: string) => void;
  onScene?: (p: number, pro: number) => void;
}

type El = HTMLElement;

const SOUND_LABEL = { on: "Sound on", off: "Sound off" } as const;

export class FilmEngine {
  readonly map: StoryMap;
  private root: El;
  private opts: FilmEngineOptions;
  private embed: "hero" | "hall" | null;
  private reduceMotion: boolean;
  private els = new Map<string, Element | null>();
  private status: FilmStatus;

  // Scroll progress. `target` is where the reader is, `prog` follows it.
  private target = 0;
  private prog = 0;

  // Gate
  private gateStart = 0;
  private wantSound = false;
  private choosing = false;

  // Watch mode
  private how: "scroll" | "watch" = "scroll";
  private playing = false;
  private playLast = 0;
  private wt = 0;
  /** Watch speed, 1x to 2x. */
  private rate = 1;
  private startTimer = 0;
  private hintTimer = 0;
  private skipShown = true;
  private skipToEnd = false;
  private skimTipped = false;

  // Opening
  private threadLen = 600;
  private lastCC = -1;
  private lastWords = -1;
  private lastSlate = -1;
  private sfxMode = "";
  private sfxLocal = 0;

  // Envelope
  private envOpen = false;
  private envTimer = 0;
  private tiltX = 0;
  private tiltY = 0;
  private tiltTX = 0;
  private tiltTY = 0;

  // Panel
  private pSent = false;

  // Chapters
  private lastChapter = -2;
  private chapters: Array<[string, number]>;
  private railBtns: HTMLButtonElement[] = [];

  // Storm
  private bubbles: Array<{
    el: El;
    at: number;
    z: number;
    dx: number;
    dy: number;
    rot: number;
    tilt: number;
  }> = [];

  // Confetti
  private bits: Array<{
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
  }> = [];
  private bitsOn = false;
  private confetti: HTMLCanvasElement | null = null;

  private ac = new AbortController();
  private frame = 0;
  private raf = 0;
  private t0 = 0;
  private vhProbe: El | null = null;
  private vhCached = 0;

  constructor(options: FilmEngineOptions) {
    this.opts = options;
    this.root = options.root;
    this.embed = options.embed ?? null;
    this.reduceMotion = options.reduceMotion;
    this.map = createJsMap();
    this.chapters = chaptersOf(this.map);
    this.status = {
      entered: !!this.embed,
      choosing: false,
      how: "scroll",
      playing: false,
      captions: true,
      soundOn: false,
      chapter: 0,
      envelopeOpen: false,
    };
  }

  /** Story progress that the scene renders, 0 to 1 through the whole film. */
  get raw() {
    return this.prog;
  }

  get scene(): SceneState {
    const sv = clamp((this.prog - PRO) / (1 - PRO), 0, 1);
    return this.map.sceneAt(sv);
  }

  get totalTime() {
    return this.map.totalTime();
  }

  // ---------------------------------------------------------------- elements

  private q<T extends Element = El>(id: string): T | null {
    if (this.els.has(id)) return this.els.get(id) as T | null;
    const el = this.root.querySelector<T>(`#${id}`);
    this.els.set(id, el);
    return el;
  }

  private stableVh() {
    if (!this.vhProbe) return window.innerHeight;
    return (
      this.vhCached ||
      (this.vhCached = this.vhProbe.offsetHeight || window.innerHeight)
    );
  }

  private totalScroll() {
    const track = this.q("track");
    return track ? track.offsetHeight - this.stableVh() : 0;
  }

  private nativeProgress() {
    const total = this.totalScroll();
    return total > 0 ? clamp(window.scrollY / total, 0, 1) : 0;
  }

  private scrollToRaw(r: number) {
    // Watching, time is the clock, not the scroll bar: moving means moving the film's time.
    if (this.how === "watch" && this.status.entered) {
      const sv = clamp((r - PRO) / (1 - PRO), 0, 1);
      this.wt = this.map.tFromS(sv);
      this.target = r;
      this.opts.onSeek?.(this.wt);
      this.syncScroll(r);
      return;
    }
    const total = this.totalScroll();
    window.scrollTo({
      top: r * total,
      behavior: this.reduceMotion ? "auto" : "smooth",
    });
  }

  /** Puts the page where the film is, without animating, for when Scroll takes over from Watch. */
  private syncScroll(r: number) {
    window.scrollTo({
      top: r * this.totalScroll(),
      behavior: "instant" as ScrollBehavior,
    });
  }

  private yFromS(sv: number) {
    return this.map.rawFromS(sv) * this.totalScroll();
  }

  private sFromY(y: number) {
    const total = this.totalScroll();
    return total > 0 ? clamp((y / total - PRO) / (1 - PRO), 0, 1) : 0;
  }

  // ------------------------------------------------------------------- mount

  mount() {
    this.gateStart = performance.now();
    this.t0 = performance.now();
    this.op.embed = this.embed;
    // Hand the document's canvas to this mount's slot; the module keeps its own
    // GL context and its own reference to `op` either way.
    this.host?.adopt(this.q("glHost") ?? this.root);

    this.buildVhProbe();
    this.buildStorm();
    this.buildRail();
    this.buildGuests();
    this.wireGate();
    this.wireNav();
    this.wireEnvelope();
    this.wirePanel();
    this.wireOpening();

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }

    this.target = this.prog = this.nativeProgress();

    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize);
    this.onVisibility = this.onVisibility.bind(this);
    document.addEventListener("visibilitychange", this.onVisibility);

    this.loadRustMap();

    const tick = () => {
      this.frame = requestAnimationFrame(tick);
      this.step();
    };
    this.frame = requestAnimationFrame(tick);
    this.frameGate = requestAnimationFrame(this.gateTick);
    return this;
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.frameGate);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.ac.abort();
    window.clearTimeout(this.envTimer);
    window.clearTimeout(this.hintTimer);
    window.clearTimeout(this.startTimer);
    this.vhProbe?.remove();
    this.vhProbe = null;
    this.els.clear();
  }

  /**
   * Leave the tab and the song stops with the picture; come back and both carry on from the same
   * moment. A film the visitor paused themselves stays paused.
   */
  private onVisibility() {
    if (document.hidden) {
      this.opts.onSuspend?.(true);
      return;
    }
    this.playLast = performance.now();
    const heldByVisitor =
      this.how === "watch" && !this.playing && this.status.entered;
    if (!heldByVisitor) this.opts.onSuspend?.(false);
  }

  private watching() {
    return this.how === "watch" && this.status.entered && !this.embed;
  }

  private onScroll() {
    // Watching, the film follows its own clock; a phone's scroll jitter must not move it.
    if (this.watching()) return;
    this.target = this.nativeProgress();
  }

  private onResize() {
    this.vhCached = 0;
    if (this.watching()) return;
    this.target = this.nativeProgress();
  }

  private buildVhProbe() {
    // A stable viewport height: window.innerHeight changes every time a phone's
    // address bar slides, which made the picture flash and the story jump.
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
    document.documentElement.appendChild(probe);
    this.vhProbe = probe;
  }

  private async loadRustMap() {
    try {
      const { loadRenderEngine } = await import("@ariya/render");
      const engine = await loadRenderEngine();
      this.map.replace({
        sceneAt: (s) => engine.sceneAt(s) as SceneState,
        sFromOld: (p) => engine.sFromOld(p),
        sFromScene: (mode, k) => engine.sFromScene(mode, k),
        rawFromS: (s) => engine.rawFromS(s),
        tFromS: (s) => engine.tFromS(s),
        sFromT: (t) => engine.sFromT(t),
        cutCount: () => engine.cutCount(),
        totalTime: () => engine.totalTime(),
        replace: () => {},
      });
      this.chapters = chaptersOf(this.map);
      this.opts.onLoadEngine?.(this.map);
    } catch {
      /* the JavaScript map stands */
    }
  }

  // ------------------------------------------------------------------ status

  private setStatus(patch: Partial<FilmStatus>) {
    this.status = { ...this.status, ...patch };
    this.opts.onStatus(this.status);
  }

  // -------------------------------------------------------------------- gate

  private wireGate() {
    const hue = this.q("hue");
    hue?.addEventListener("change", (e) => {
      const t = e.target as HTMLInputElement;
      if (!t || t.name !== "hue") return;
      this.setHue(t.value);
      try {
        localStorage.setItem("ariya-colour", t.value);
      } catch {
        /* fine */
      }
    });

    this.q("enterSound")?.addEventListener("click", () => this.enter(true));
    this.q("enterQuiet")?.addEventListener("click", () => this.enter(false));
    this.q("howScroll")?.addEventListener("click", () =>
      this.enter(false, "scroll")
    );
    this.q("howWatch")?.addEventListener("click", () =>
      this.enter(false, "watch")
    );

    this.setHue(this.opts.velvet);
    const mins = this.q("howMins");
    if (mins) {
      const TT = this.map.totalTime();
      mins.textContent = `${Math.floor(TT / 60)}:${`0${Math.round(TT % 60)}`.slice(-2)}`;
    }
  }

  private setHue(name: string) {
    document.documentElement.setAttribute("data-velvet", name);
    const w = HUES[name] ?? HUES.burgundy;
    const a = this.q("hueA");
    const b = this.q("hueB");
    if (a) a.textContent = w[0];
    if (b) b.textContent = w[1];
    const r = this.root.querySelector<HTMLInputElement>(
      `#hue input[value="${name}"]`
    );
    if (r) r.checked = true;
  }

  velvet() {
    return (
      new URLSearchParams(location.search).get("velvet") ?? this.opts.velvet
    );
  }

  private enter(withSound: boolean, choice?: "scroll" | "watch") {
    if (this.status.entered) return;
    const gate = this.q("gate");
    const howEl = this.q("how");
    if (!choice) {
      this.wantSound = withSound;
      this.choosing = true;
      gate?.classList.add("choose");
      if (howEl) howEl.hidden = false;
      this.q<HTMLButtonElement>("howScroll")?.focus();
      this.setStatus({ choosing: true });
      return;
    }
    this.setSound(this.choosing ? this.wantSound : withSound);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    this.target = this.prog = 0;
    gate?.classList.add("gone");
    document.documentElement.classList.remove("locked");
    window.setTimeout(() => {
      if (gate) gate.hidden = true;
    }, 1500);
    this.setStatus({ entered: true, choosing: false });
    this.setHow(choice, this.reduceMotion ? 300 : 1200);
  }

  private frameGate = 0;

  private gateTick = () => {
    if (this.status.entered) return;
    const waited = (performance.now() - this.gateStart) / 1000;
    const loaded = this.loaded;
    const shown = loaded > 0 ? loaded : Math.min(0.9, waited / 12);
    const bar = this.q("loadBar");
    const txt = this.q("loadTxt");
    const btn = this.q<HTMLButtonElement>("enterSound");
    if (bar) bar.style.transform = `scaleX(${shown.toFixed(3)})`;
    const ready = loaded >= 1 || this.failed || waited > 14;
    if (txt) {
      txt.textContent = ready
        ? "The hall is ready"
        : `Setting the hall ${Math.round(shown * 100)}%`;
    }
    if (btn) btn.disabled = !ready;
    this.frameGate = requestAnimationFrame(this.gateTick);
  };

  /**
   * The handshake the scene script speaks. It assigns `OP.render` and reports
   * `OP.loaded` / `OP.failed`; we publish the rest of the frame.
   *
   * The object itself belongs to the document's scene host: the module captures
   * `window.OP` once, at evaluation, so a per-mount object here would be one the
   * module never writes to.
   */
  private host = sceneHost();
  private op: Record<string, unknown> = this.host?.op ?? {};

  get loaded(): number {
    return Number(this.op.loaded) || 0;
  }

  get failed(): boolean {
    return !!this.op.failed;
  }

  /** The scene's frame hook, as the archive's module installs it. */
  get sceneRender() {
    return this.op.render as ((p: number, t: number) => void) | null;
  }

  // ------------------------------------------------------------------- sound

  private paintSound(onOff: boolean) {
    const btn = this.q("soundBtn");
    if (!btn) return;
    btn.classList.toggle("sound-on", onOff);
    btn.setAttribute("aria-pressed", onOff ? "true" : "false");
    const lbl = btn.querySelector(".lbl");
    if (lbl) lbl.textContent = onOff ? SOUND_LABEL.on : SOUND_LABEL.off;
  }

  private setSound(onOff: boolean) {
    this.paintSound(onOff);
    this.onSoundChange?.(onOff);
    this.setStatus({ soundOn: onOff });
  }

  onSoundChange?: (on: boolean) => void;

  private wireNav() {
    this.paintSound(this.status.soundOn);
    this.q("soundBtn")?.addEventListener("click", () => {
      this.setSound(!this.status.soundOn);
    });
    this.q("home")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.scrollToRaw(0);
    });
    this.q("replay")?.addEventListener("click", () => this.replayFilm());
    this.root
      .querySelectorAll<HTMLAnchorElement>('a[href="#start"]')
      .forEach((a) => {
        a.addEventListener("click", () => {
          if (!this.status.entered) this.enter(false, "scroll");
        });
      });
    this.wireObar();
  }

  // ----------------------------------------------------------------- opening

  private wireOpening() {
    const path = this.q<SVGPathElement>("threadPath");
    if (path?.getTotalLength) this.threadLen = path.getTotalLength();
    if (path) {
      path.style.strokeDasharray = String(this.threadLen);
      path.style.strokeDashoffset = String(this.threadLen);
    }
  }

  // ---------------------------------------------------------------- envelope

  private wireEnvelope() {
    this.q("seal")?.addEventListener("click", () => this.openEnv());

    const name = this.q<HTMLInputElement>("guestName");
    name?.addEventListener("input", () => {
      const who = this.q("who");
      const to = this.q("toName");
      const g = this.guest();
      if (who) who.textContent = g;
      if (to) to.textContent = g;
    });

    this.q("yes")?.addEventListener("click", (e) => {
      const reply = this.q("reply");
      if (reply) {
        reply.textContent = `You're on the list, ${this.guest()}. The couple will keep your place. A confirmation is on its way.`;
      }
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.burst(r.left + r.width / 2, r.top);
      this.opts.onChime?.();
    });

    this.q("no")?.addEventListener("click", () => {
      const reply = this.q("reply");
      if (reply) {
        reply.textContent = `Thank you, ${this.guest()}. The couple will see your reply straight away.`;
      }
    });

    const wrap = this.q("envwrap");
    wrap?.addEventListener("pointermove", (e) => {
      const pe = e as PointerEvent;
      if (this.reduceMotion || pe.pointerType !== "mouse") return;
      const r = wrap.getBoundingClientRect();
      const u = (pe.clientX - r.left) / r.width;
      const v = (pe.clientY - r.top) / r.height;
      this.tiltTX = clamp((u - 0.5) * 2, -1, 1);
      this.tiltTY = clamp((v - 0.5) * 2, -1, 1);
      const card = this.q("card");
      if (card) {
        card.style.setProperty("--sx", `${(u * 100).toFixed(1)}%`);
        card.style.setProperty("--sy", `${(v * 100).toFixed(1)}%`);
      }
    });
    wrap?.addEventListener("pointerleave", () => {
      this.tiltTX = this.tiltTY = 0;
    });
  }

  private guest() {
    const el = this.q<HTMLInputElement>("guestName");
    return (el?.value ?? "").trim() || "Guest";
  }

  private openEnv() {
    if (this.envOpen) return;
    this.envOpen = true;
    this.q("env")?.classList.add("open");
    window.clearTimeout(this.envTimer);
    this.envTimer = window.setTimeout(() => {
      this.q("env")?.classList.add("out");
    }, 1700);
    this.setStatus({ envelopeOpen: true });
  }

  private closeEnv() {
    if (!this.envOpen) return;
    this.envOpen = false;
    window.clearTimeout(this.envTimer);
    const env = this.q("env");
    env?.classList.remove("open");
    env?.classList.remove("out");
    this.setStatus({ envelopeOpen: false });
  }

  // ------------------------------------------------------------------- panel

  private wirePanel() {
    this.q("pBtn")?.addEventListener("click", () => {
      if (this.pSent) return;
      this.pSent = true;
      this.opts.onChime?.();
    });
  }

  // ---------------------------------------------------------- storm and rail

  private buildStorm() {
    const storm = this.q("storm");
    if (!storm) return;
    const rnd = seeded(7);
    this.bubbles = MESSAGES.map((m, i) => {
      const el = document.createElement("div");
      el.className = "bub";
      const hh = 14 + Math.floor(i / 3);
      const mm = (i * 7 + 3) % 60;
      el.innerHTML = `<b>${m[0]}</b>${m[1]}<i>${hh}:${mm < 10 ? "0" : ""}${mm}</i>`;
      const x = 2 + (i % 3) * 28 + rnd() * 16;
      const y = 16 + Math.floor(i / 3) * 10 + rnd() * 6;
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      const z = rnd();
      el.style.zIndex = String(Math.round(z * 10));
      storm.appendChild(el);
      const ang = Math.atan2(y - 50, x + 10 - 50);
      return {
        el,
        at: 0.3 + i * 0.0105,
        z,
        dx: Math.cos(ang),
        dy: Math.sin(ang),
        rot: (rnd() - 0.5) * 70,
        tilt: (rnd() - 0.5) * 8,
      };
    });
  }

  private buildRail() {
    const list = this.q("railList");
    if (!list) return;
    this.railBtns = this.chapters.map((c, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `<span>${c[0]}</span><i></i>`;
      b.setAttribute("aria-label", `Chapter ${i}: ${c[0]}`);
      b.addEventListener("click", () => this.jumpToChapter(i));
      li.appendChild(b);
      list.appendChild(li);
      return b;
    });
  }

  private buildGuests() {
    const rows = this.q("guestRows");
    if (!rows) return;
    GUEST_ROWS.forEach((g) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${g[0]}</span><em>${g[1]}</em><i>Coming</i>`;
      rows.appendChild(li);
    });
  }

  jumpToChapter(i: number) {
    const c = this.chapters[i];
    if (!c) return;
    if (!this.status.entered) this.enter(false, "scroll");
    this.scrollToRaw(c[1] < 0 ? 0 : this.map.rawFromS(c[1]));
  }

  // ----------------------------------------------------------------- confetti

  private burst(x: number, y: number) {
    if (this.reduceMotion) return;
    const cv = (this.confetti ??= this.q<HTMLCanvasElement>("confetti"));
    const cx = cv?.getContext("2d");
    if (!cv || !cx) return;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    const cols = ["#e9c98a", "#f4efe6", "#c1283d", "#b8864b"];
    for (let i = 0; i < 160; i += 1) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2;
      const s = 6 + Math.random() * 10;
      this.bits.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        w: 4 + Math.random() * 6,
        h: 3 + Math.random() * 5,
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        c: cols[i % 4],
        life: 130 + Math.random() * 60,
      });
    }
    if (!this.bitsOn) {
      this.bitsOn = true;
      requestAnimationFrame(this.stepBits);
    }
  }

  private stepBits = () => {
    const cv = this.confetti;
    const cx = cv?.getContext("2d");
    if (!cv || !cx) {
      this.bitsOn = false;
      return;
    }
    cx.clearRect(0, 0, cv.width, cv.height);
    this.bits = this.bits.filter((b) => b.life > 0 && b.y < cv.height + 40);
    for (const b of this.bits) {
      b.vy += 0.3;
      b.vx *= 0.985;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      b.life -= 1;
      cx.save();
      cx.translate(b.x, b.y);
      cx.rotate(b.r);
      cx.globalAlpha = Math.min(1, b.life / 40);
      cx.fillStyle = b.c;
      cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      cx.restore();
    }
    if (this.bits.length) requestAnimationFrame(this.stepBits);
    else {
      this.bitsOn = false;
      cx.clearRect(0, 0, cv.width, cv.height);
    }
  };

  // ------------------------------------------------------ watch / scroll mode

  private setHow(m: "scroll" | "watch", startIn?: number) {
    const was = this.how;
    if (m === "watch" && was !== "watch") {
      // From the page's position, once; from here the clock leads.
      this.wt = this.map.tFromS(this.sFromY(window.scrollY));
    } else if (m === "scroll" && was === "watch") {
      this.playing = false;
      this.syncScroll(this.target);
    }
    this.how = m;
    window.clearTimeout(this.startTimer);
    this.startTimer = 0;
    document.documentElement.classList.toggle("watching", m === "watch");
    this.opts.onLoop?.(m !== "watch");

    const obPlay = this.q<HTMLButtonElement>("obPlay");
    const obMode = this.q("obMode");
    if (obPlay) obPlay.hidden = m !== "watch";
    const speedWrap = this.q("obSpeedWrap");
    if (speedWrap) speedWrap.hidden = m !== "watch";
    if (m !== "watch") this.q("obSpeedPanel")?.setAttribute("hidden", "");
    const lbl = obMode?.querySelector(".lbl");
    if (lbl) lbl.textContent = m === "watch" ? "Scroll" : "Watch";
    obMode?.setAttribute(
      "aria-label",
      m === "watch"
        ? "Scroll instead, at your own pace"
        : "Watch: the film plays itself"
    );

    this.setStatus({ how: m });
    if (m === "watch" && startIn) {
      this.setPlaying(false, true);
      this.startTimer = window.setTimeout(() => {
        this.startTimer = 0;
        if (this.how === "watch") this.setPlaying(true);
      }, startIn);
    } else {
      this.setPlaying(m === "watch");
    }
  }

  private setPlaying(on: boolean, keepSong?: boolean) {
    this.playing = on;
    this.playLast = performance.now();
    if (on && this.wt >= this.map.totalTime() - 0.05) {
      this.jumpTo(0);
      this.target = this.prog = 0;
      this.opts.onRestart?.();
      this.wt = 0;
    }
    if (on && this.how === "watch") this.opts.onSeek?.(this.wt);

    const obPlay = this.q("obPlay");
    obPlay?.setAttribute("aria-pressed", on ? "true" : "false");
    const lbl = obPlay?.querySelector(".lbl");
    if (lbl) lbl.textContent = on ? "Pause" : "Play";
    if (!keepSong) this.opts.onSuspend?.(this.songHeld());
    this.setStatus({ playing: on });
    if (on) requestAnimationFrame(this.playStep);
  }

  private songHeld() {
    return (
      this.how === "watch" &&
      !this.playing &&
      this.status.entered &&
      !this.startTimer
    );
  }

  /**
   * Watching: the film's time moves by the clock and drives the picture directly, never through the
   * scroll bar, so a phone's address bar, momentum or re-layout cannot make it skip. The song is the
   * reference: time follows it by small corrections, and only snaps when they have really come apart
   * (a seek, a stall). Pausing for the song to buffer holds the picture instead of running ahead.
   */
  private playStep = (now: number) => {
    if (!this.playing) return;
    const dt = Math.min(0.1, Math.max(0, (now - this.playLast) / 1000));
    this.playLast = now;
    const TT = this.map.totalTime();
    if (!this.opts.onWaiting?.()) this.wt += dt * this.rate;
    const ck = this.opts.onClock?.() ?? null;
    if (ck !== null && !this.opts.onWaiting?.()) {
      const d = ck - this.wt;
      if (Math.abs(d) > 0.9) this.wt = ck;
      else this.wt += d * Math.min(1, dt * 2.5);
    }
    this.wt = clamp(this.wt, 0, TT);
    this.target = this.map.rawFromS(this.map.sFromT(this.wt));
    if (this.wt >= TT) {
      this.playing = false;
      this.setStatus({ playing: false });
      this.setHow("scroll");
      return;
    }
    requestAnimationFrame(this.playStep);
  };

  /** Watch speed, 1x to 2x in any step; the song follows it. */
  setRate(r: number) {
    const rate = clamp(Math.round(r * 20) / 20, 1, 2);
    this.rate = rate;
    this.opts.onRate?.(rate);
    const out = rate.toFixed(2).replace(/\.?0+$/, "");
    const btn = this.q("obSpeed");
    if (btn) {
      const val = btn.querySelector(".val");
      if (val) val.textContent = `${out}×`;
    }
    const slider = this.q<HTMLInputElement>("obRate");
    if (slider && Number(slider.value) !== rate) slider.value = String(rate);
    slider?.setAttribute("aria-valuetext", `${out} times`);
    try {
      sessionStorage.setItem("ariya-film-rate", String(rate));
    } catch {
      /* not remembered */
    }
  }

  private jumpTo(y: number) {
    window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
  }

  private replayFilm() {
    this.jumpTo(0);
    this.wt = 0;
    this.target = this.prog = 0;
    this.opts.onRestart?.();
    this.setPlaying(this.how === "watch");
  }

  private lockHint() {
    const hint = this.q("ohint");
    if (!hint) return;
    hint.textContent = this.playing
      ? "Playing by itself. Pause, or choose Scroll to move at your own pace."
      : "Paused. Press Play, or choose Scroll to move at your own pace.";
    hint.classList.add("on");
    window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => hint.classList.remove("on"), 2600);
  }

  private wireObar() {
    // A destroyed engine (React strict mode mounts twice in development) must not keep answering clicks.
    const sig = { signal: this.ac.signal };
    this.q("obPlay")?.addEventListener(
      "click",
      () => {
        if (this.startTimer) {
          window.clearTimeout(this.startTimer);
          this.startTimer = 0;
          this.setPlaying(false);
          return;
        }
        this.setPlaying(!this.playing);
      },
      sig
    );
    this.q("obReplay")?.addEventListener("click", () => this.replayFilm(), sig);

    // Speed: a slider from 1x to 2x, with the usual stops as shortcuts.
    const panel = this.q("obSpeedPanel");
    const speedBtn = this.q<HTMLButtonElement>("obSpeed");
    speedBtn?.addEventListener(
      "click",
      () => {
        if (!panel) return;
        const open = panel.hasAttribute("hidden");
        if (open) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
        speedBtn.setAttribute("aria-expanded", open ? "true" : "false");
      },
      sig
    );
    this.q<HTMLInputElement>("obRate")?.addEventListener(
      "input",
      (e) => {
        this.setRate(Number((e.target as HTMLInputElement).value));
      },
      sig
    );
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-rate]")
      .forEach((b) =>
        b.addEventListener(
          "click",
          () => this.setRate(Number(b.dataset.rate)),
          sig
        )
      );
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape" && panel && !panel.hasAttribute("hidden")) {
          panel.setAttribute("hidden", "");
          speedBtn?.setAttribute("aria-expanded", "false");
          speedBtn?.focus();
        }
      },
      sig
    );
    try {
      const saved = Number(sessionStorage.getItem("ariya-film-rate"));
      if (saved >= 1 && saved <= 2) this.setRate(saved);
    } catch {
      /* start at 1x */
    }
    this.q("obSkip")?.addEventListener(
      "click",
      () => {
        this.scrollToRaw(
          this.skipToEnd ? 1 : this.map.rawFromS(this.map.sFromScene("C", 0.01))
        );
      },
      sig
    );
    this.q("obMode")?.addEventListener(
      "click",
      () => {
        this.setHow(this.how === "watch" ? "scroll" : "watch");
      },
      sig
    );
    this.q("obCC")?.addEventListener(
      "click",
      () => {
        const captions = !this.status.captions;
        document.documentElement.classList.toggle("cc-off", !captions);
        this.q("obCC")?.setAttribute(
          "aria-pressed",
          captions ? "true" : "false"
        );
        this.setStatus({ captions });
      },
      sig
    );

    try {
      this.skimTipped = !!sessionStorage.getItem("ariya-skim-tip");
    } catch {
      /* show it this visit */
    }

    ["wheel", "touchmove", "keydown"].forEach((ev) => {
      window.addEventListener(
        ev,
        (e) => {
          if (!(this.how === "watch" && this.status.entered)) return;
          const ke = e as KeyboardEvent;
          if (
            ev === "keydown" &&
            !/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(ke.key)
          ) {
            return;
          }
          const target = e.target as El | null;
          if (target?.closest?.(".sheet, .cm, input, textarea, select")) return;
          e.preventDefault();
          this.lockHint();
        },
        { passive: false }
      );
    });
  }

  // ---------------------------------------------------------------- the frame

  private step() {
    if (this.embed) {
      if (this.embed === "hero") {
        if (this.loaded >= 1 && !this.embedT0) this.embedT0 = performance.now();
        const k = this.reduceMotion
          ? 1
          : this.embedT0
            ? smooth((performance.now() - this.embedT0) / 9000)
            : 0;
        this.target =
          PRO * 0.39 +
          (this.map.rawFromS(this.map.sFromOld(0.215)) - PRO * 0.39) * k;
      } else {
        this.target = this.map.rawFromS(this.map.sFromOld(this.embedP));
      }
      if (this.embedPaused) return;
    }

    // Behind the door, before anyone enters: hold on the ring above its box.
    if (
      !this.embed &&
      !this.status.entered &&
      this.loaded >= 1 &&
      !this.failed
    ) {
      this.target = this.prog = this.map.rawFromS(this.map.sFromOld(0.27));
      this.q("gate")?.classList.add("live");
    }

    this.prog += (this.target - this.prog) * 0.085;
    if (Math.abs(this.target - this.prog) < 0.00005) this.prog = this.target;

    const r = this.prog;
    const sv = clamp((r - PRO) / (1 - PRO), 0, 1);
    const sc = this.map.sceneAt(sv);
    const p = sc.p;
    if (r < PRO) {
      sc.fade = 0;
      sc.vis = 1;
    }

    this.sv = sv;
    this.updateDom(r, p, sv, sc);

    const pro = clamp(r / PRO, 0, 1);
    this.op.raw = r;
    this.op.pro = pro;
    this.op.p = p;
    this.op.s = sv;
    this.op.scene = sc;
    this.op.velvet = this.velvet();
    this.op.entered = this.status.entered;
    this.op.covered = this.covered;
    this.op.blackout = this.blackout;

    if (this.status.entered) this.opts.onScene?.(p, pro);
    this.sceneRender?.(
      p,
      this.host?.now() ?? (performance.now() - this.t0) / 1000
    );
  }

  sv = 0;
  private embedT0 = 0;
  private embedP = 0;
  embedPaused = false;

  setEmbedProgress(p: number) {
    this.embedP = clamp(p, 0, 1);
  }

  setEmbedPaused(paused: boolean) {
    this.embedPaused = paused;
  }

  // --------------------------------------------------------------- updateDom

  private setBlur(el: El, px: number) {
    const v = px > 0.15 ? `blur(${px.toFixed(1)}px)` : "none";
    if (el.style.filter !== v) el.style.filter = v;
  }

  private beatEls: Array<{
    el: El;
    raw: boolean;
    scene: ModeName | null;
    a: number;
    b: number;
    base: string;
    low: boolean;
  }> = [];

  /** Called once the markup is in the DOM. */
  collectBeats() {
    this.beatEls = Array.from(
      this.root.querySelectorAll<HTMLElement>(".beat")
    ).map((el) => {
      const raw = el.dataset.rawIn !== undefined;
      const low = el.classList.contains("low");
      return {
        el,
        raw,
        scene: (el.dataset.scene as ModeName) || null,
        a: parseFloat(
          raw ? (el.dataset.rawIn as string) : (el.dataset.in as string)
        ),
        b: parseFloat(
          raw ? (el.dataset.rawOut as string) : (el.dataset.out as string)
        ),
        base: low ? "" : "translateY(-50%) ",
        low,
      };
    });
  }

  private updateDom(r: number, p: number, sv: number, sc: SceneState) {
    this.updateOpening(sc);
    this.updateObar(sv);

    const bar = this.q("bar");
    if (bar) bar.style.transform = `scaleX(${r.toFixed(4)})`;

    const oldLayer = this.q("oldLayer");
    const newLayer = this.q("newLayer");
    if (oldLayer) {
      oldLayer.style.opacity = sc.mode === "old" ? sc.vis.toFixed(3) : "0";
      oldLayer.style.visibility = sc.mode === "old" ? "visible" : "hidden";
    }

    let shade = 0;
    let oldShade = 0;
    for (const bt of this.beatEls) {
      const q = bt.raw ? r : bt.scene ? sc.local : p;
      const w = bt.raw ? 0.006 : bt.scene ? 0.06 : 0.025;
      let o =
        (bt.a <= 0 ? 1 : seg(q, bt.a, bt.a + w)) *
        (bt.b >= 1 ? 1 : 1 - seg(q, bt.b - w, bt.b));
      if (!bt.raw && r < PRO) o = 0;
      if (bt.scene && bt.scene !== sc.mode) o = 0;
      if (bt.scene) shade = Math.max(shade, o);
      else if (bt.low) oldShade = Math.max(oldShade, o);
      bt.el.style.opacity = o.toFixed(3);
      bt.el.style.transform = `${bt.base}translateY(${((1 - o) * 18).toFixed(1)}px) scale(${(1 + (1 - o) * 0.04).toFixed(4)})`;
      bt.el.style.visibility = o < 0.01 ? "hidden" : "visible";
      this.setBlur(bt.el, this.reduceMotion ? 0 : (1 - o) * 12);
    }
    newLayer?.style.setProperty("--scrim", shade.toFixed(3));
    oldLayer?.style.setProperty("--scrim", (oldShade * 0.85).toFixed(3));

    this.updateStorm(p);
    this.updateFlash(p);
    this.updateEnvelope(p);
    this.updateCount(p);
    this.updatePanel(sc);
    this.updateBiz(r, sv);
  }

  private updateStorm(p: number) {
    const shatter = seg(p, 0.46, 0.53);
    const W = window.innerWidth;
    const focusZ = 0.15 + 0.7 * seg(p, 0.31, 0.45);
    for (const bb of this.bubbles) {
      const inn = seg(p, bb.at, bb.at + 0.012);
      const o = inn * (1 - shatter);
      const d = shatter * W * (0.6 + bb.z * 0.6);
      const depthScale = 0.78 + bb.z * 0.42;
      bb.el.style.opacity = (o * (0.55 + 0.45 * bb.z)).toFixed(3);
      bb.el.style.transform =
        `translate(${(bb.dx * d).toFixed(1)}px,${(bb.dy * d + (1 - inn) * 24).toFixed(1)}px) ` +
        `rotate(${(bb.tilt + bb.rot * shatter).toFixed(1)}deg) ` +
        `scale(${(depthScale * (0.9 + inn * 0.1 - shatter * 0.3)).toFixed(3)})`;
      bb.el.style.visibility = o < 0.01 ? "hidden" : "visible";
      if (o >= 0.01) {
        this.setBlur(
          bb.el,
          this.reduceMotion ? 0 : Math.abs(bb.z - focusZ) * 9 + shatter * 6
        );
      }
    }
    const groupbar = this.q("groupbar");
    if (groupbar)
      groupbar.style.opacity = bump(p, 0.29, 0.31, 0.46, 0.5).toFixed(3);
    const unread = this.q("unread");
    if (unread)
      unread.textContent = String(Math.round(seg(p, 0.3, 0.46) * 312));
  }

  private updateFlash(p: number) {
    const flash = this.q("flash");
    if (!flash) return;
    const fl = bump(p, 0.64, 0.668, 0.676, 0.7);
    flash.style.opacity = (fl * 0.92).toFixed(3);
    flash.style.setProperty(
      "--iris",
      (0.3 + 0.75 * seg(p, 0.64, 0.69)).toFixed(3)
    );
    flash.style.setProperty("--spin", `${((p - 0.6) * 2400).toFixed(1)}deg`);
    flash.style.setProperty(
      "--glint",
      bump(p, 0.645, 0.66, 0.672, 0.69).toFixed(3)
    );
  }

  private updateEnvelope(p: number) {
    const envwrap = this.q("envwrap");
    if (!envwrap) return;
    const eo = bump(p, 0.675, 0.7, 0.765, 0.785);
    this.tiltX += (this.tiltTX - this.tiltX) * 0.08;
    this.tiltY += (this.tiltTY - this.tiltY) * 0.08;
    const fit = Math.min(1, (window.innerHeight - 110) / 640);
    envwrap.style.opacity = eo.toFixed(3);
    envwrap.style.transform =
      `translate(-50%, -50%) translateY(${((1 - eo) * 60).toFixed(1)}px) ` +
      `scale(${(fit * (0.92 + eo * 0.08)).toFixed(3)}) ` +
      `rotateX(${(-this.tiltY * 4 + (1 - eo) * 18).toFixed(2)}deg) ` +
      `rotateY(${(this.tiltX * 5).toFixed(2)}deg)`;
    envwrap.style.visibility = eo < 0.01 ? "hidden" : "visible";
    envwrap.style.pointerEvents = eo > 0.6 ? "auto" : "none";
    if (p > 0.735 && p < 0.8) this.openEnv();
    if (p < 0.67 || p > 0.8) this.closeEnv();
  }

  private updateCount(p: number) {
    const fill = seg(p, 0.79, 0.87);
    const confirmed = this.q("cConfirmed");
    const seated = this.q("cSeated");
    const rows = this.q("guestRows");
    if (confirmed) confirmed.textContent = String(Math.round(fill * 241));
    const seatedCount = Math.round(fill * 218);
    if (seated) seated.textContent = String(seatedCount);

    const scrim = this.q("scrim");
    if (scrim) scrim.style.opacity = bump(p, 0.775, 0.8, 0.88, 0.9).toFixed(3);

    const guests = this.q("guests");
    const go = bump(p, 0.785, 0.81, 0.875, 0.895);
    if (guests) {
      guests.style.opacity = go.toFixed(3);
      guests.style.transform = `translateY(-50%) translateX(${((1 - go) * 30).toFixed(1)}px)`;
    }
    rows?.querySelectorAll("li").forEach((li, i) => {
      li.classList.toggle("in", fill > ((i + 0.5) / GUEST_ROWS.length) * 0.95);
    });
  }

  private updatePanel(sc: SceneState) {
    const panel = this.q("panel");
    if (!panel) return;
    const u = sc.mode === "F" ? sc.local : -1;
    const vis = u < 0 ? 0 : bump(u, 0.24, 0.32, 0.86, 0.94);
    panel.style.opacity = vis.toFixed(3);
    panel.classList.toggle("on", vis > 0.05);
    panel.style.transform = `translate(-50%, -50%) translateY(${((1 - vis) * 16).toFixed(1)}px)`;
    if (u < 0) return;
    if (u < 0.2) this.pSent = false;
    if (!this.pSent && u > 0.8) this.pSent = true;

    const query = this.q("pQuery");
    if (query)
      query.textContent = "Ijeoma".slice(
        0,
        Math.floor(seg(u, 0.3, 0.42) * 6.99)
      );
    this.q("pRow")?.classList.toggle("on", u > 0.42);
    const btn = this.q<HTMLButtonElement>("pBtn");
    if (btn) btn.disabled = this.pSent || u < 0.45;
    const pill = this.q("pPill");
    if (pill) {
      pill.textContent = this.pSent ? "Invitation sent" : "Invitation not sent";
      pill.className = `pill ${this.pSent ? "sent" : "wait"}`;
    }
    const note = this.q("pNote");
    if (note) {
      note.textContent = this.pSent
        ? "Sent by text message, with her own link."
        : u > 0.45
          ? "Tap to send her own invitation."
          : "";
    }
  }

  private updateBiz(r: number, sv: number) {
    const biz = this.q("biz");
    if (!biz) return;
    const bt = biz.getBoundingClientRect().top;
    const vh = window.innerHeight;
    this.covered = !this.embed && bt <= 0;
    const nav = this.q("nav");
    nav?.classList.toggle("solid", bt < vh * 0.5);
    this.q("rail")?.classList.toggle("off", bt < vh * 0.6);
    const footUi = this.q("footUi");
    if (footUi) footUi.style.opacity = bt < vh * 0.8 ? "0" : "1";
    const cue = this.q("scrollcue");
    if (cue) cue.style.opacity = r < 0.02 ? "1" : "0";

    let active = 0;
    this.chapters.forEach((c, i) => {
      if (i === 0 || (sv >= c[1] - 0.003 && r >= PRO)) active = i;
    });
    if (!this.status.entered) active = 0;
    if (bt < vh * 0.5) active = -1;
    if (active === this.lastChapter) return;
    this.lastChapter = active;

    const whereNo = this.q("whereNo");
    const whereName = this.q("whereName");
    if (whereNo) {
      whereNo.textContent =
        active < 0 ? "" : `${active < 10 ? "00" : "0"}${active}`;
      const sib = whereNo.previousElementSibling as HTMLElement | null;
      if (sib) sib.hidden = active < 0;
    }
    if (whereName) {
      whereName.textContent = active < 0 ? "Àríyá" : this.chapters[active][0];
    }
    this.railBtns.forEach((b, i) => {
      if (i === active) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    if (active !== this.status.chapter) this.setStatus({ chapter: active });
  }

  covered = false;

  private updateObar(sv: number) {
    const obar = this.q("obar");
    const barOn = this.status.entered && !this.covered;
    if (obar) {
      obar.classList.toggle("on", barOn);
      document.documentElement.classList.toggle("obar-on", barOn);
    }
    const toEnd = sv > this.map.sFromScene("N", 1) - 0.004;
    const skip = sv < 0.97;
    const obSkip = this.q("obSkip");
    if (toEnd !== this.skipToEnd) {
      this.skipToEnd = toEnd;
      if (obSkip) {
        const t = obSkip.querySelector(".t");
        if (t) {
          t.innerHTML = toEnd
            ? 'Skip<span class="long"> to the end</span>'
            : 'Skip<span class="long"> the opening</span>';
        }
        obSkip.setAttribute(
          "aria-label",
          toEnd ? "Skip to the end" : "Skip the opening"
        );
      }
    }
    if (skip !== this.skipShown) {
      this.skipShown = skip;
      if (obSkip) obSkip.hidden = !skip;
    }
  }

  private updateOpening(sc: SceneState) {
    const m = sc.mode;
    const u = sc.local;
    const inOpening = (mode: ModeName) =>
      mode === "R" || mode === "M" || mode === "N";
    const open = inOpening(m) && this.status.entered;

    const lift =
      sc.mode === "old" && sc.p >= 0.1 && sc.p < 0.285 && this.status.entered;
    const wm: ModeName | "L" = lift ? "L" : m;
    const wu = lift ? (sc.p - 0.1) / 0.185 : u;

    const pick = <T extends readonly [string, number, number, ...unknown[]]>(
      list: ReadonlyArray<T>,
      mode: string,
      at: number
    ) => {
      for (let i = 0; i < list.length; i += 1) {
        if (list[i][0] === mode && at >= list[i][1] && at < list[i][2])
          return i;
      }
      return -1;
    };

    const ccEl = this.q("cc");
    const ci = open && sc.vis > 0.5 ? pick(OPEN_LINES, m, u) : -1;
    if (ci !== this.lastCC) {
      this.lastCC = ci;
      if (ci >= 0) {
        const L = OPEN_LINES[ci];
        const who = this.q("ccWho");
        const line = this.q("ccLine");
        if (who) who.textContent = L[3];
        if (line) line.textContent = L[4];
        ccEl?.classList.toggle("sfx", L[5] === "sfx");
      }
      if (ccEl) ccEl.style.opacity = ci >= 0 ? "1" : "0";
    }

    const wordsEl = this.q("words");
    const wi = open || lift ? pick(OPEN_WORDS, wm, wu) : -1;
    const wk = lift ? 0.05 : 0.012;
    if (wi !== this.lastWords) {
      this.lastWords = wi;
      if (wi >= 0 && wordsEl) wordsEl.innerHTML = OPEN_WORDS[wi][3];
    }
    if (wordsEl) {
      wordsEl.style.opacity =
        wi >= 0
          ? String(
              Math.min(
                seg(wu, OPEN_WORDS[wi][1], OPEN_WORDS[wi][1] + wk),
                1 - seg(wu, OPEN_WORDS[wi][2] - 0.012, OPEN_WORDS[wi][2])
              )
            )
          : "0";
    }

    const slateEl = this.q("slate");
    const si = open ? pick(OPEN_SLATES, m, u) : -1;
    if (si !== this.lastSlate) {
      this.lastSlate = si;
      if (si >= 0 && slateEl) slateEl.textContent = OPEN_SLATES[si][3];
    }
    if (slateEl) slateEl.style.opacity = si >= 0 ? "1" : "0";

    this.blackout =
      m === "N" ? Math.min(seg(u, 0.4, 0.44), 1 - seg(u, 0.555, 0.6)) : 0;

    const th = lift ? seg(wu, 0.8, 0.995) : m === "C" ? 1 - seg(u, 0, 0.06) : 0;
    const threadEl = this.q("thread");
    const path = this.q<SVGPathElement>("threadPath");
    if (threadEl)
      threadEl.style.opacity = (lift ? Math.min(1, th * 3) : th).toFixed(3);
    if (path) {
      path.style.strokeDashoffset = (
        this.threadLen *
        (1 - (lift ? th : 1))
      ).toFixed(1);
    }
    const openEl = this.q("opening");
    if (openEl) {
      openEl.style.visibility = open || lift || th > 0 ? "visible" : "hidden";
    }

    if (open && m === this.sfxMode) {
      for (const cue of OPEN_SFX) {
        if (
          cue[0] === m &&
          this.sfxLocal < cue[1] &&
          u >= cue[1] &&
          u - cue[1] < 0.06
        ) {
          this.opts.onSfx?.(cue[2]);
        }
      }
    }
    this.sfxMode = m;
    this.sfxLocal = u;
    this.opts.onAmbience?.(open ? m : "");
  }

  blackout = 0;
}
