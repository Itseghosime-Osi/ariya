import {
  burstSound,
  FIREWORK_SAMPLES,
  launchSound,
  loadSamples,
  playSample,
  sampleOf,
  type SampleName,
} from "../rocket-sound";

// Àríyá's home page music. It loops /site/assets/music.ogg — Ogg Opus, named
// so the server sends audio/ogg (a .opus extension is served as
// application/octet-stream, which some browsers refuse to play). Copyrighted
// and served publicly by the owner's choice. Fallback: the same song as AAC in
// .m4a, then an original owambe groove generated live with the Web Audio API —
// juju and highlife in 12/8 at 104 BPM. Ported from public/site/assets/score.js.
//
// Nothing plays until start() is called from a click or tap.

// Smallest first: Opus is ~1.75MB, the AAC fallback ~2.6MB, replacing a 7MB
// file that was AAC-in-ADTS all along.
const MUSIC_URLS = ["/site/assets/music.ogg", "/site/assets/music.m4a"];

const BPM = 104;
const STEP = 60 / BPM / 3; // 12 eighth-note triplet steps per bar

// Highlife progression in F: F – Bb – C – Bb (two bars each)
const CHORDS = [
  { root: 41, tones: [53, 57, 60, 65] },
  { root: 46, tones: [53, 58, 62, 65] },
  { root: 48, tones: [55, 60, 64, 67] },
  { root: 46, tones: [53, 58, 62, 65] },
];
const BELL = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]; // standard 12/8 bell
const GTR1 = [0, null, 2, null, 1, 3, null, 2, null, 1, 3, null];
const GTR2 = [null, 3, null, 2, null, null, 1, null, 3, null, null, 2];
const BASS = [0, null, null, 7, null, null, 0, null, 12, null, 7, null];
// bar-4 call: step, note, length in steps
const HORN: ReadonlyArray<readonly [number, number, number]> = [
  [0, 72, 2],
  [3, 74, 1],
  [4, 77, 2],
  [7, 74, 1],
  [9, 72, 3],
];

type Ctor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode;
let bus: GainNode;
let comp: DynamicsCompressorNode;
let timer: number | null = null;
let nextT = 0;
let step = 0;
let on = false;
let noiseBuf: AudioBuffer;
let audioEl: HTMLAudioElement | null = null;
// Index into MUSIC_URLS; past the end means every file failed.
let fileIndex = 0;
let installed = false;

const listeners = new Set<(on: boolean) => void>();

function hz(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function env(g: GainNode, t: number, a: number, peak: number, d: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function osc(
  type: OscillatorType,
  f: number,
  t: number,
  dur: number,
  dest: AudioNode,
  detune?: number
) {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (detune) o.detune.value = detune;
  o.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

function build() {
  const AudioCtor: Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: Ctor }).webkitAudioContext;
  ctx = new AudioCtor();
  void loadSamples(ctx, [...FIREWORK_SAMPLES, ...GROOVE_SAMPLES]);
  master = ctx.createGain();
  master.gain.value = 0;
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3.5;
  bus = ctx.createGain();
  const verb = ctx.createConvolver();
  const len = ctx.sampleRate * 2.6;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
  }
  verb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  bus.connect(comp);
  bus.connect(verb);
  verb.connect(wet);
  wet.connect(comp);
  comp.connect(master);
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
}

function noise(t: number, hp: number, peak: number, dec: number, bp?: boolean) {
  const s = ctx!.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx!.createBiquadFilter();
  f.type = bp ? "bandpass" : "highpass";
  f.frequency.value = hp;
  if (bp) f.Q.value = 1.2;
  const g = ctx!.createGain();
  s.connect(f);
  f.connect(g);
  g.connect(bus);
  env(g, t, 0.003, peak, dec);
  s.start(t, Math.random() * 0.4, dec + 0.1);
}

function bell(t: number, hi?: boolean) {
  const g = ctx!.createGain();
  g.connect(bus);
  env(g, t, 0.002, 0.07, 0.28);
  const f = hi ? 1180 : 880;
  osc("sine", f, t, 0.35, g);
  osc("sine", f * 2.76, t, 0.15, g);
  osc("square", f * 1.01, t, 0.05, g);
}

function talking(t: number, from: number, to: number, peak: number) {
  const g = ctx!.createGain();
  const f = ctx!.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  f.connect(g);
  g.connect(bus);
  env(g, t, 0.004, peak, 0.34);
  const o = ctx!.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + 0.22);
  o.connect(f);
  o.start(t);
  o.stop(t + 0.42);
  noise(t, 1800, peak * 0.15, 0.03, true);
}

function conga(t: number, f0: number, peak: number) {
  const g = ctx!.createGain();
  g.connect(bus);
  env(g, t, 0.002, peak, 0.16);
  const o = ctx!.createOscillator();
  o.frequency.setValueAtTime(f0 * 1.4, t);
  o.frequency.exponentialRampToValueAtTime(f0, t + 0.04);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.25);
}

function kick(t: number) {
  const g = ctx!.createGain();
  g.connect(bus);
  env(g, t, 0.003, 0.4, 0.28);
  const o = ctx!.createOscillator();
  o.frequency.setValueAtTime(125, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.2);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.35);
}

function pluck(m: number, t: number, vol: number, bright?: boolean) {
  const g = ctx!.createGain();
  const f = ctx!.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(bright ? 4200 : 2800, t);
  f.frequency.exponentialRampToValueAtTime(700, t + 0.3);
  f.Q.value = 2;
  f.connect(g);
  g.connect(bus);
  env(g, t, 0.003, vol, 0.38);
  osc("sawtooth", hz(m), t, 0.45, f, -4);
  osc("triangle", hz(m), t, 0.45, f, 4);
}

function bass(m: number, t: number) {
  const g = ctx!.createGain();
  const f = ctx!.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 380;
  f.connect(g);
  g.connect(bus);
  env(g, t, 0.008, 0.22, 0.42);
  osc("triangle", hz(m), t, 0.5, f);
  osc("sine", hz(m), t, 0.5, g);
}

function pad(ch: { tones: number[] }, t: number, dur: number) {
  ch.tones.forEach((m, k) => {
    const g = ctx!.createGain();
    const f = ctx!.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1100;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.012, t + 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    f.connect(g);
    g.connect(bus);
    osc("sawtooth", hz(m), t, dur + 0.7, f, -6 + k * 3);
    osc("sawtooth", hz(m), t, dur + 0.7, f, 6 - k * 3);
  });
}

function horn(m: number, t: number, dur: number) {
  const g = ctx!.createGain();
  const f = ctx!.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(600, t);
  f.frequency.linearRampToValueAtTime(2400, t + 0.06);
  f.frequency.linearRampToValueAtTime(1400, t + dur);
  f.connect(g);
  g.connect(bus);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.04);
  g.gain.setValueAtTime(0.05, t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
  osc("sawtooth", hz(m), t, dur + 0.2, f, -5);
  osc("sawtooth", hz(m - 12), t, dur + 0.2, f, 5);
  osc("sawtooth", hz(m + 4), t, dur + 0.2, f, 0);
}

function schedule() {
  while (nextT < ctx!.currentTime + 0.14) {
    const s = step % 12;
    const bar = Math.floor(step / 12);
    const ch = CHORDS[Math.floor(bar / 2) % 4];
    const phrase = bar % 8;
    const intro = bar < 2;
    if (BELL[s]) bell(nextT, s === 0 || s === 7);
    noise(nextT, 7000, s % 3 === 0 ? 0.05 : 0.022, 0.05); // shekere
    if (!intro) {
      if (s === 0 || s === 6) kick(nextT);
      if (s === 3 || s === 9) conga(nextT, 210, 0.12);
      if (s === 5 || s === 11) conga(nextT, 300, 0.08);
      const b = BASS[s];
      if (b != null) bass(ch.root + b, nextT);
      const g1 = GTR1[s];
      if (g1 != null) pluck(ch.tones[g1] + 12, nextT, 0.05, true);
      const g2 = GTR2[s];
      if (g2 != null && bar > 3) pluck(ch.tones[g2], nextT, 0.04, false);
      if (s === 0 && bar % 2 === 0) pad(ch, nextT, STEP * 24);
      // Talking drum: a call at the end of every second bar, answered a bar later.
      if (bar % 2 === 1 && (s === 7 || s === 9 || s === 10)) {
        talking(nextT, s === 10 ? 260 : 200, s === 10 ? 150 : 120, 0.2);
      }
      if (phrase === 4 && s === 2) talking(nextT, 320, 170, 0.16);
      if (phrase === 7) {
        for (const [at, note, len] of HORN) {
          if (at === s) horn(note, nextT, len * STEP);
        }
      }
    }
    nextT += STEP;
    step++;
  }
}

function tell() {
  for (const fn of listeners) fn(on);
}

export function onMusicChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isOn() {
  return on;
}

export function start(at = 0): boolean {
  try {
    if (!ctx) build();
    ctx!.resume();
  } catch {
    return false;
  }
  on = true;
  if (fileIndex < MUSIC_URLS.length) {
    // Try each recording in turn (Opus, then AAC); fall back to the
    // generated groove if none of them play. One bad source can announce
    // itself three ways (error event, rejected play(), HEAD check), so only
    // step forward once — otherwise the AAC file is skipped entirely.
    let fellBack = false;
    const fallback = () => {
      if (fellBack) return;
      fellBack = true;
      fileIndex += 1;
      audioEl = null;
      if (on) start();
    };
    const url = MUSIC_URLS[fileIndex];
    if (!audioEl) {
      audioEl = new Audio(url);
      audioEl.loop = true;
      audioEl.volume = 0.55;
      audioEl.addEventListener("error", fallback);
      // A missing file does not always raise "error" (some browsers just keep
      // loading), so ask for it once and fall back if it is not there.
      try {
        fetch(url, { method: "HEAD" }).then((r) => {
          if (!r.ok || /text\/html/.test(r.headers.get("content-type") ?? "")) {
            fallback();
          }
        }, fallback);
      } catch {
        /* the error event still covers it */
      }
    }
    const el = audioEl;
    if (at > 0) {
      el.addEventListener(
        "loadedmetadata",
        () => {
          el.currentTime = at % (el.duration || 1e9);
        },
        { once: true }
      );
      if (el.readyState >= 1) el.currentTime = at % el.duration;
    }
    // Fade the song in rather than starting at full volume.
    el.volume = 0;
    const v0 = performance.now();
    (function fade() {
      if (!audioEl || !on) return;
      const k = Math.min(1, (performance.now() - v0) / 1600);
      audioEl.volume = 0.55 * levelNow * k;
      if (k < 1) requestAnimationFrame(fade);
    })();
    // A browser that blocks sound without a tap leaves the music off rather
    // than falling back.
    const p = el.play();
    if (p && p.catch) {
      p.catch((e: DOMException) => {
        if (!e || e.name === "AbortError") return;
        if (e.name === "NotAllowedError") {
          on = false;
          tell();
        } else fallback();
      });
    }
    // for the seal and chime sounds
    master!.gain.cancelScheduledValues(ctx!.currentTime);
    master!.gain.setTargetAtTime(0.8, ctx!.currentTime, 0.2);
    return true;
  }
  if (!timer) {
    nextT = ctx!.currentTime + 0.08;
    step = 0;
    timer = window.setInterval(schedule, 25);
  }
  master!.gain.cancelScheduledValues(ctx!.currentTime);
  master!.gain.setTargetAtTime(0.8, ctx!.currentTime, 0.6);
  on = true;
  return true;
}

export function stop() {
  on = false;
  if (audioEl) audioEl.pause();
  if (ctx) master!.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
}

// Little sounds for interactions; silent unless the music is on.
export function crack() {
  if (!on || !ctx) return;
  const t = ctx.currentTime;
  noise(t, 1200, 0.35, 0.05, true);
  noise(t + 0.03, 2600, 0.25, 0.04, true);
  noise(t + 0.07, 900, 0.18, 0.08, true);
}

export function chime() {
  if (!on || !ctx) return;
  const t = ctx.currentTime;
  [72, 77, 81, 84].forEach((m, i) => {
    pluck(m, t + i * 0.08, 0.08, true);
    bell(t + i * 0.08, true);
  });
}

function pause(hidden: boolean) {
  if (audioEl) {
    if (hidden) audioEl.pause();
    else if (on) void audioEl.play();
  }
  if (ctx) {
    if (hidden) void ctx.suspend();
    else if (on) void ctx.resume();
  }
}

// Called once from the page so a hidden tab is silent and a handoff from the
// previous page resumes where it left off.
export function installScoreHandlers() {
  if (installed) return () => {};
  installed = true;
  const onVisibility = () => pause(document.hidden);
  document.addEventListener("visibilitychange", onVisibility);

  let handoff: { on: boolean; t?: number } | null = null;
  try {
    handoff = JSON.parse(sessionStorage.getItem("ariya-music") ?? "null") as {
      on: boolean;
      t?: number;
    } | null;
    sessionStorage.removeItem("ariya-music");
  } catch {
    handoff = null;
  }
  if (handoff?.on) {
    if (start(handoff.t ?? 0)) tell();
  }

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    installed = false;
  };
}

/* ---------- The film's clock, ambience and described sounds ----------
   The home page's Watch mode keeps time by the song, so the picture never runs
   ahead of it, and the score sits under the dialogue until the yes. Ported from
   the archive's Score: clock, seek, level, ambience, sfx. */

let lastSeek = 0;
// 1 normally; falls to 0 over the last seconds of the song once the film has finished.
let fadeK = 1;
let tailRaf = 0;
// The song starts under the picture, never over it; the dance brings it up.
let levelNow = 0.2;
let amb: {
  src: AudioBufferSourceNode;
  f: BiquadFilterNode;
  g: GainNode;
  kind: string;
  nextTick: number;
} | null = null;

/** The song's position while it is really playing; null when it is not the clock. */
export function clock(): number | null {
  return audioEl && on && !audioEl.paused && audioEl.readyState >= 2
    ? audioEl.currentTime
    : null;
}

/** The song is playing but waiting for data: Watch holds rather than run ahead. */
export function waiting(): boolean {
  return !!(audioEl && on && !audioEl.paused && audioEl.readyState < 3);
}

export function time(): number {
  return audioEl ? audioEl.currentTime : 0;
}

/** Moving the song makes it stutter, so it moves only for a real jump. */
export function seek(t: number) {
  if (!audioEl) return;
  const now = performance.now();
  if (Math.abs(audioEl.currentTime - t) < 0.4 || now - lastSeek < 350) return;
  lastSeek = now;
  try {
    audioEl.currentTime = Math.max(0, t);
  } catch {
    /* not loaded yet */
  }
}

/** Watch speed: the song plays faster or slower with the film, at the same pitch. */
export function setRate(r: number) {
  if (!audioEl) return;
  audioEl.playbackRate = r;
  (audioEl as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch =
    true;
}

/** In Watch the song plays once and ends with the film; scrolling, it loops. */
export function loop(v: boolean) {
  if (audioEl) audioEl.loop = v;
}

export function restart() {
  fadeK = 1;
  cancelAnimationFrame(tailRaf);
  if (audioEl) {
    try {
      audioEl.currentTime = 0;
    } catch {
      /* not loaded yet */
    }
  }
  step = 0;
}

/**
 * The film is over but the song has a little left: let it play out once and fade away over its last
 * few seconds, then stay silent until Watch again.
 */
export function finale() {
  if (!audioEl) return;
  audioEl.loop = false;
  cancelAnimationFrame(tailRaf);
  const step = () => {
    const el = audioEl;
    if (!el || !on || el.ended) return;
    const left = (el.duration - el.currentTime) / (el.playbackRate || 1);
    fadeK = Number.isFinite(left) ? Math.max(0, Math.min(1, left / 3.5)) : 1;
    if (!el.paused) {
      const v = Math.max(0, Math.min(1, 0.55 * levelNow * fadeK));
      if (Math.abs(el.volume - v) > 0.004) el.volume = v;
    }
    tailRaf = requestAnimationFrame(step);
  };
  tailRaf = requestAnimationFrame(step);
}

export function suspend(yes: boolean) {
  if (audioEl) {
    if (yes) audioEl.pause();
    else if (on && !audioEl.ended) void audioEl.play().catch(() => {});
  }
  if (ctx) {
    if (yes) void ctx.suspend();
    else if (on) void ctx.resume();
  }
}

/**
 * The score sits under the dialogue until the yes, then rises. `l` is the share
 * of full volume, eased so a chapter change never jumps.
 */
export function level(l: number) {
  levelNow += (l - levelNow) * (l > levelNow ? 0.015 : 0.08);
  if (audioEl && on && !audioEl.paused) {
    const v = Math.max(0, Math.min(1, 0.55 * levelNow * fadeK));
    if (Math.abs(audioEl.volume - v) > 0.01) audioEl.volume = v;
  } else if (ctx && on && timer) {
    master!.gain.setTargetAtTime(0.8 * levelNow, ctx.currentTime, 0.2);
  }
}

/* ---------- The dance groove ----------
   When the guests dance, real percussion (conga, slap, bell, shekere, bass drum) plays on top of the
   song, on the song's own beat, so it sits inside the music rather than over it. The beat is found
   from the recording: 103.6 beats a minute with the first beat 0.29 s in; a bar is four of them in
   12/8 (twelve triplet steps). Each hit is placed from the song's clock, so a seek or a change of
   speed does not pull it off the beat. It follows the song's own volume: nothing before the dance,
   full while the song is full, gone as the song's outro thins. */

export const GROOVE_SAMPLES: SampleName[] = [
  "kick",
  "conga",
  "slap",
  "shekere",
  "agogo",
];
const GROOVE_BPM = 103.6;
const GROOVE_FIRST = 0.29;
const GROOVE_STEP = 60 / GROOVE_BPM / 3;
const GROOVE_OUTRO = [141, 147]; // the song thins here; the groove goes with it
// [sample, gain] per triplet step of the bar; null is a rest
const GROOVE: ReadonlyArray<ReadonlyArray<readonly [SampleName, number]>> = [
  [
    ["kick", 0.9],
    ["shekere", 0.35],
  ],
  [["shekere", 0.15]],
  [
    ["shekere", 0.2],
    ["agogo", 0.3],
  ],
  [
    ["conga", 0.6],
    ["shekere", 0.3],
  ],
  [["shekere", 0.15]],
  [
    ["slap", 0.5],
    ["agogo", 0.3],
    ["shekere", 0.2],
  ],
  [
    ["kick", 0.7],
    ["shekere", 0.3],
  ],
  [
    ["shekere", 0.15],
    ["agogo", 0.3],
  ],
  [["shekere", 0.2]],
  [
    ["conga", 0.75],
    ["agogo", 0.3],
    ["shekere", 0.3],
  ],
  [["shekere", 0.15]],
  [
    ["slap", 0.55],
    ["agogo", 0.3],
    ["shekere", 0.2],
  ],
];
let grooveBus: GainNode | null = null;
let grooveTimer: number | null = null;
let grooveStep = -1;

function grooveGain(songT: number) {
  const dance = Math.max(0, Math.min(1, (levelNow - 0.3) / 0.6));
  const [a, b] = GROOVE_OUTRO;
  const outro = 1 - Math.max(0, Math.min(1, (songT - a) / (b - a)));
  return dance * outro * fadeK;
}

function grooveTick() {
  const el = audioEl;
  const c = ctx;
  if (!el || !c || !on || el.paused || el.ended) return;
  if (!GROOVE_SAMPLES.every((n) => sampleOf(c, n))) return;
  const songT = el.currentTime;
  const rate = el.playbackRate || 1;
  if (!grooveBus) {
    grooveBus = c.createGain();
    grooveBus.connect(c.destination);
  }
  const k = grooveGain(songT);
  grooveBus.gain.setTargetAtTime(0.9 * k, c.currentTime, 0.12);
  if (k < 0.02) {
    grooveStep = Math.floor((songT - GROOVE_FIRST) / GROOVE_STEP) + 1;
    return;
  }
  const first = Math.floor((songT - GROOVE_FIRST) / GROOVE_STEP) + 1;
  // After a seek, start again from the step the song is now on.
  if (grooveStep < first - 1 || grooveStep > first + 12) grooveStep = first;
  const horizon = songT + 0.25 * rate;
  while (GROOVE_FIRST + grooveStep * GROOVE_STEP < horizon) {
    const at =
      c.currentTime + (GROOVE_FIRST + grooveStep * GROOVE_STEP - songT) / rate;
    if (at > c.currentTime - 0.02 && grooveStep >= 0) {
      const hits = GROOVE[((grooveStep % 12) + 12) % 12];
      for (const [name, g] of hits) {
        playSample(c, grooveBus, name, Math.max(at, c.currentTime), g);
      }
    }
    grooveStep += 1;
  }
}

/** Run the groove alongside the song; harmless when the recordings have not loaded. */
export function groove(yes: boolean) {
  if (!yes) {
    if (grooveTimer !== null) window.clearInterval(grooveTimer);
    grooveTimer = null;
    grooveStep = -1;
    return;
  }
  if (grooveTimer === null) {
    grooveTimer = window.setInterval(grooveTick, 60);
  }
}

/** Room tone: a clock for Tunde's room, the murmur of a party for the memory. */
export function ambience(kind: string) {
  if (!ctx || !on) kind = "";
  if (!ctx) return;
  if (!amb && kind) {
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    src.buffer = buf;
    src.loop = true;
    src.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    g.gain.value = 0;
    src.start();
    amb = { src, f, g, kind: "", nextTick: 0 };
  }
  if (!amb) return;
  if (kind !== amb.kind) {
    amb.kind = kind;
    const t = ctx.currentTime;
    amb.f.type = kind === "M" ? "bandpass" : "lowpass";
    amb.f.frequency.setTargetAtTime(kind === "M" ? 520 : 240, t, 0.2);
    amb.f.Q.value = kind === "M" ? 0.6 : 0.5;
    amb.g.gain.setTargetAtTime(kind === "M" ? 0.05 : kind ? 0.012 : 0, t, 0.4);
  }
  if (kind === "R" && ctx.currentTime > amb.nextTick) {
    amb.nextTick = Math.ceil(ctx.currentTime) + 1;
    tick(amb.nextTick);
  }
  if (kind === "M") {
    amb.g.gain.setTargetAtTime(
      0.045 +
        0.02 *
          Math.sin(ctx.currentTime * 1.7) *
          Math.sin(ctx.currentTime * 0.6),
      ctx.currentTime,
      0.3
    );
  }
}

function filmNoise(
  t: number,
  dur: number,
  type: BiquadFilterType,
  f: number,
  q: number,
  peak: number,
  a?: number
) {
  const src = ctx!.createBufferSource();
  src.buffer = noiseBuf;
  const fl = ctx!.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = ctx!.createGain();
  src.connect(fl);
  fl.connect(g);
  g.connect(ctx!.destination);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + (a || 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t, Math.random() * 0.3, dur + 0.05);
}

function tick(t: number) {
  filmNoise(t, 0.02, "highpass", 3800, 0.7, 0.018, 0.001);
}

/** Described sounds for the opening; there is no recorded dialogue in the film. */
const SFX: Record<string, (t: number) => void> = {
  paper: (t) => {
    for (let i = 0; i < 5; i += 1) {
      filmNoise(
        t + i * 0.07 + Math.random() * 0.04,
        0.09 + Math.random() * 0.06,
        "bandpass",
        2600 + Math.random() * 1800,
        0.9,
        0.05,
        0.005
      );
    }
  },
  breath: (t) => filmNoise(t, 0.9, "bandpass", 620, 0.7, 0.025, 0.35),
  chair: (t) => {
    filmNoise(t, 0.45, "lowpass", 380, 0.6, 0.06, 0.05);
    filmNoise(t + 0.32, 0.12, "lowpass", 160, 0.8, 0.07, 0.005);
  },
  fabric: (t) => filmNoise(t, 0.5, "bandpass", 1500, 0.4, 0.03, 0.12),
  set: (t) => {
    const g = ctx!.createGain();
    g.connect(ctx!.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    const o = ctx!.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.2);
    filmNoise(t, 0.03, "highpass", 2400, 0.7, 0.03, 0.002);
  },
  hinge: (t) => {
    for (let i = 0; i < 7; i += 1) {
      filmNoise(
        t + i * 0.035,
        0.03,
        "bandpass",
        3200 - i * 140,
        6,
        0.02,
        0.003
      );
    }
    const g = ctx!.createGain();
    g.connect(ctx!.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    const o = ctx!.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(820, t);
    o.frequency.linearRampToValueAtTime(690, t + 0.28);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.32);
  },
  clink: (t) => {
    [2350, 3120, 4180].forEach((f, k) => {
      const g = ctx!.createGain();
      g.connect(ctx!.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03 / (k + 1), t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      const o = ctx!.createOscillator();
      o.frequency.value = f;
      o.connect(g);
      o.start(t);
      o.stop(t + 1);
    });
  },
  tick,
};

/** Plays one described sound, if the visitor has turned sound on. */
/**
 * A firework rocket: the thump of the launch, a rising hiss and whistle for the climb, then at the
 * top a deep boom, a sharp crack and the crackle of falling sparks. `rise` is the climb in seconds
 * and `pan` places it left (-1) to right (1) like the burst on screen. Silent unless sound is on.
 */
export function rocket(rise = 0.95, pan = 0) {
  if (!on || !ctx) return;
  const c = ctx;
  const t = c.currentTime + 0.01;
  const out = c.createGain();
  out.gain.value = 0.85;
  const panner = c.createStereoPanner?.();
  if (panner) {
    panner.pan.value = Math.max(-1, Math.min(1, pan)) * 0.7;
    out.connect(panner);
    panner.connect(c.destination);
  } else {
    out.connect(c.destination);
  }
  launchSound(c, out, t, rise);
  burstSound(c, out, t + rise, 1);
}

export function sfx(name: string) {
  if (!on || !ctx) return;
  const play = SFX[name];
  if (!play) return;
  try {
    play(ctx.currentTime + 0.01);
  } catch {
    /* a missed sound is fine */
  }
}
