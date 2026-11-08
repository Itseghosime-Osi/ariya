/**
 * Firework sounds, made with the Web Audio API so no file has to load: the launch of a rocket (a
 * thump, then a hiss and thin whistle that rise as it climbs) and the burst (a deep boom, a sharp
 * crack, and falling sparks). Shared by the film's send-off and the welcome fireworks.
 */

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.6), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

function noiseSource(ctx: BaseAudioContext, at: number, dur: number) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx);
  s.loop = true;
  s.start(at, Math.random() * 0.3);
  s.stop(at + dur + 0.05);
  return s;
}

/** A quick swell and a fall, in the exponential steps the Web Audio gain wants. */
function shape(
  g: GainNode,
  at: number,
  attack: number,
  peak: number,
  decay: number
) {
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

/** The launch: `rise` is the climb in seconds, until the burst. */
export function launchSound(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  rise: number
) {
  const thump = ctx.createGain();
  thump.connect(out);
  shape(thump, at, 0.004, 0.2, 0.16);
  const to = ctx.createOscillator();
  to.frequency.setValueAtTime(140, at);
  to.frequency.exponentialRampToValueAtTime(55, at + 0.14);
  to.connect(thump);
  to.start(at);
  to.stop(at + 0.22);

  const hiss = noiseSource(ctx, at, rise);
  const hissF = ctx.createBiquadFilter();
  hissF.type = "bandpass";
  hissF.Q.value = 2.2;
  hissF.frequency.setValueAtTime(420, at);
  hissF.frequency.exponentialRampToValueAtTime(3000, at + rise);
  const hissG = ctx.createGain();
  hiss.connect(hissF);
  hissF.connect(hissG);
  hissG.connect(out);
  hissG.gain.setValueAtTime(0.0001, at);
  hissG.gain.exponentialRampToValueAtTime(0.16, at + 0.12);
  hissG.gain.exponentialRampToValueAtTime(0.05, at + rise * 0.95);
  hissG.gain.exponentialRampToValueAtTime(0.0001, at + rise);

  const whistle = ctx.createOscillator();
  whistle.type = "sine";
  whistle.frequency.setValueAtTime(760, at);
  whistle.frequency.exponentialRampToValueAtTime(2300, at + rise);
  const whG = ctx.createGain();
  whistle.connect(whG);
  whG.connect(out);
  whG.gain.setValueAtTime(0.0001, at);
  whG.gain.exponentialRampToValueAtTime(0.03, at + 0.2);
  whG.gain.exponentialRampToValueAtTime(0.0001, at + rise);
  whistle.start(at);
  whistle.stop(at + rise + 0.05);
}

/** The burst: boom, crack, and the crackle of sparks falling away. `power` is about 0.6 to 1.3. */
export function burstSound(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  power = 1
) {
  const boom = ctx.createGain();
  boom.connect(out);
  shape(boom, at, 0.006, 0.55 * power, 0.9);
  const bo = ctx.createOscillator();
  bo.frequency.setValueAtTime(110, at);
  bo.frequency.exponentialRampToValueAtTime(26, at + 0.7);
  bo.connect(boom);
  bo.start(at);
  bo.stop(at + 1);

  const rumble = noiseSource(ctx, at, 0.9);
  const rumF = ctx.createBiquadFilter();
  rumF.type = "lowpass";
  rumF.frequency.setValueAtTime(700, at);
  rumF.frequency.exponentialRampToValueAtTime(120, at + 0.8);
  const rumG = ctx.createGain();
  rumble.connect(rumF);
  rumF.connect(rumG);
  rumG.connect(out);
  shape(rumG, at, 0.004, 0.4 * power, 0.8);

  const crack = noiseSource(ctx, at, 0.12);
  const crF = ctx.createBiquadFilter();
  crF.type = "highpass";
  crF.frequency.value = 2800;
  const crG = ctx.createGain();
  crack.connect(crF);
  crF.connect(crG);
  crG.connect(out);
  shape(crG, at, 0.002, 0.28 * power, 0.09);

  const sparks = Math.round(14 + 8 * power);
  for (let i = 0; i < sparks; i += 1) {
    const t = at + 0.12 + Math.pow(Math.random(), 1.7) * 1.7;
    const spark = noiseSource(ctx, t, 0.05);
    const sf = ctx.createBiquadFilter();
    sf.type = "bandpass";
    sf.frequency.value = 3500 + Math.random() * 3500;
    sf.Q.value = 3;
    const sg = ctx.createGain();
    spark.connect(sf);
    sf.connect(sg);
    sg.connect(out);
    shape(
      sg,
      t,
      0.001,
      0.05 + Math.random() * 0.09,
      0.03 + Math.random() * 0.03
    );
  }
}
