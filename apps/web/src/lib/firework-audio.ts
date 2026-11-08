import {
  burstSound,
  FIREWORK_SAMPLES,
  launchSound,
  loadSamples,
} from "./rocket-sound";

type FireworkSound = "launch" | "burst";

interface SoundOptions {
  /** How long the rocket climbs, in seconds. */
  rise?: number;
  /** Where it is, -1 (left) to 1 (right). */
  pan?: number;
  /** About 0.6 to 1.3: a bigger shell sounds bigger. */
  power?: number;
}

let context: AudioContext | null = null;
let chain: { input: GainNode } | null = null;
const readyListeners = new Set<() => void>();

function getContext() {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!context) {
    context = new Ctor();
    void loadSamples(context, FIREWORK_SAMPLES);
  }
  return context;
}

/** One output for every shell, with a limiter, so a finale's volley is loud but never clips. */
function output(audio: AudioContext) {
  if (!chain) {
    const input = audio.createGain();
    input.gain.value = 0.7;
    const comp = audio.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    input.connect(comp);
    comp.connect(audio.destination);
    chain = { input };
  }
  return chain.input;
}

/** True when sound can play right now. */
export function fireworkAudioReady() {
  return context?.state === "running";
}

/** Be told when sound becomes available (the visitor tapped, or the browser allowed it). */
export function onFireworkAudioReady(listener: () => void) {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
}

function announce() {
  if (fireworkAudioReady()) for (const fn of readyListeners) fn();
}

/**
 * Try to start sound. A browser lets this through after a tap or key press on the page, and
 * sometimes after earlier interaction with the site; otherwise it stays quiet and returns false.
 */
export async function unlockFireworkAudio(): Promise<boolean> {
  const audio = getContext();
  if (!audio) return false;
  try {
    if (audio.state !== "running") await audio.resume();
  } catch {
    return false;
  }
  void loadSamples(audio, FIREWORK_SAMPLES);
  announce();
  return audio.state === "running";
}

/** Unlock sound effects on a real user gesture, before a later celebration begins. */
export function enableFireworkAudioOnInteraction() {
  if (typeof document === "undefined") return () => {};
  const unlock = () => {
    document.removeEventListener("pointerdown", unlock, true);
    document.removeEventListener("keydown", unlock, true);
    void unlockFireworkAudio();
  };
  document.addEventListener("pointerdown", unlock, {
    once: true,
    capture: true,
  });
  document.addEventListener("keydown", unlock, { once: true, capture: true });

  return () => {
    document.removeEventListener("pointerdown", unlock, true);
    document.removeEventListener("keydown", unlock, true);
  };
}

/** Rocket sounds: the launch as a rocket leaves, the burst when it opens. Silent if sound is blocked. */
export function playFireworkSound(
  sound: FireworkSound,
  options: SoundOptions = {}
) {
  const audio = getContext();
  if (!audio || audio.state !== "running") return;
  const out = output(audio);
  let dest: AudioNode = out;
  if (typeof audio.createStereoPanner === "function") {
    const pan = audio.createStereoPanner();
    pan.pan.value = Math.max(-1, Math.min(1, options.pan ?? 0)) * 0.75;
    pan.connect(out);
    dest = pan;
  }
  const at = audio.currentTime + 0.01;
  if (sound === "launch") launchSound(audio, dest, at, options.rise ?? 0.9);
  else burstSound(audio, dest, at, options.power ?? 1);
}
