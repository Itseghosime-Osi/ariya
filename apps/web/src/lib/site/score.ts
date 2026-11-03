// Àríyá's home page music. It loops /site/assets/music.mp3, which is
// copyrighted and served publicly by the owner's choice. Fallback: an original
// owambe groove generated live with the Web Audio API — juju and highlife in
// 12/8 at 104 BPM. Ported from public/site/assets/score.js.
//
// Nothing plays until start() is called from a click or tap.

// Smallest first: the Opus encode is ~1.7MB, the AAC fallback ~2.5MB,
// replacing a 7MB file that was AAC-in-ADTS all along.
const MUSIC_URLS = ["/site/assets/music.opus", "/site/assets/music.m4a"];

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
    // generated groove if none of them play.
    const fallback = () => {
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
      audioEl.volume = 0.55 * k;
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
