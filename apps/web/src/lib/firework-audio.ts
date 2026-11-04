type FireworkSound = "launch" | "burst";

let context: AudioContext | null = null;
let audioUnlocked = false;

function getContext() {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  context ??= new window.AudioContext();
  return context;
}

function playLaunch(context: AudioContext) {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const pan = context.createStereoPanner();
  const end = now + 0.48;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(175, now);
  oscillator.frequency.exponentialRampToValueAtTime(590, end);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.045, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  pan.pan.value = Math.random() * 0.6 - 0.3;

  oscillator.connect(gain);
  gain.connect(pan);
  pan.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(end);
}

function playBurst(context: AudioContext) {
  const now = context.currentTime;
  const duration = 0.38;
  const length = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }

  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  const thump = context.createOscillator();
  const thumpGain = context.createGain();
  const pan = context.createStereoPanner();
  const end = now + duration;

  noise.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, now);
  filter.frequency.exponentialRampToValueAtTime(480, end);
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.linearRampToValueAtTime(0.085, now + 0.018);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, end);

  thump.type = "sine";
  thump.frequency.setValueAtTime(105, now);
  thump.frequency.exponentialRampToValueAtTime(38, now + 0.22);
  thumpGain.gain.setValueAtTime(0.07, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  pan.pan.value = Math.random() * 0.8 - 0.4;

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(pan);
  thump.connect(thumpGain);
  thumpGain.connect(pan);
  pan.connect(context.destination);
  noise.start(now);
  noise.stop(end);
  thump.start(now);
  thump.stop(now + 0.25);
}

/** Unlock sound effects on a real user gesture, before a later celebration begins. */
export function enableFireworkAudioOnInteraction() {
  if (typeof document === "undefined") return () => {};
  const unlock = () => {
    document.removeEventListener("pointerdown", unlock, true);
    document.removeEventListener("keydown", unlock, true);
    const audio = getContext();
    if (!audio) return;
    audioUnlocked = true;
    void audio.resume().catch(() => {
      audioUnlocked = false;
    });
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

/** Original, brief firework sounds; never used by the automatic splash. */
export function playFireworkSound(sound: FireworkSound) {
  if (!audioUnlocked || typeof window === "undefined") return;
  const audio = getContext();
  if (!audio) return;

  const play = () => {
    if (!audioUnlocked || audio.state !== "running") return;
    if (sound === "launch") playLaunch(audio);
    else playBurst(audio);
  };

  if (audio.state === "running") {
    play();
    return;
  }

  void audio
    .resume()
    .then(play)
    .catch(() => {
      audioUnlocked = false;
    });
}
