/* Àríyá's home page music. For the class demo it loops assets/music.mp3 ("Yori Yori" by Abefe), which is
   copyrighted: fine for a private demo, not for a public site without a licence.
   Fallback: an original owambe groove generated live with the Web Audio API (no audio files). A juju and highlife feel in 12/8 at 104 BPM: agogo bell (the standard 12/8 bell), shekere, talking drum
   calls, conga and kick, a two-guitar highlife figure, walking bass, warm pads and a short horn hook.

   To play a recording instead, put the file at assets/music.mp3 (or change MUSIC_URL below). It loops in place
   of the generated groove; if the file is missing or can't play, the generated groove plays instead.

   Nothing plays until AriyaScore.start() is called from a click or tap. */
(function () {
  var MUSIC_URL = "assets/music.mp3";
  var fileFailed = false;

  var ctx = null, master, bus, verb, comp, timer = null, nextT = 0, step = 0, on = false, noiseBuf, audioEl = null;
  var BPM = 104, STEP = 60 / BPM / 3; // 12 eighth-note triplet steps per bar
  // Highlife progression in F: F – Bb – C – Bb (two bars each)
  var chords = [
    { root: 41, tones: [53, 57, 60, 65] }, { root: 46, tones: [53, 58, 62, 65] },
    { root: 48, tones: [55, 60, 64, 67] }, { root: 46, tones: [53, 58, 62, 65] }
  ];
  var BELL = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];          // standard 12/8 bell
  var GTR1 = [0, null, 2, null, 1, 3, null, 2, null, 1, 3, null];
  var GTR2 = [null, 3, null, 2, null, null, 1, null, 3, null, null, 2];
  var BASS = [0, null, null, 7, null, null, 0, null, 12, null, 7, null];
  var HORN = [[0, 72, 2], [3, 74, 1], [4, 77, 2], [7, 74, 1], [9, 72, 3]]; // bar-4 call: step, note, length in steps

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, f, t, dur, dest, detune) { var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5;
    bus = ctx.createGain();
    verb = ctx.createConvolver();
    var len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir;
    var wet = ctx.createGain(); wet.gain.value = 0.22;
    bus.connect(comp); bus.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(master); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0); for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
  }
  function noise(t, hp, peak, dec, bp) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = bp ? "bandpass" : "highpass"; f.frequency.value = hp; if (bp) f.Q.value = 1.2;
    var g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(bus); env(g, t, 0.003, peak, dec); s.start(t, Math.random() * 0.4, dec + 0.1);
  }
  function bell(t, hi) { var g = ctx.createGain(); g.connect(bus); env(g, t, 0.002, 0.07, 0.28); var f = hi ? 1180 : 880; osc("sine", f, t, 0.35, g); osc("sine", f * 2.76, t, 0.15, g); osc("square", f * 1.01, t, 0.05, g); }
  function talking(t, from, to, peak) { var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; f.connect(g); g.connect(bus); env(g, t, 0.004, peak, 0.34); var o = ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + 0.22); o.connect(f); o.start(t); o.stop(t + 0.42); noise(t, 1800, peak * 0.15, 0.03, true); }
  function conga(t, f0, peak) { var g = ctx.createGain(); g.connect(bus); env(g, t, 0.002, peak, 0.16); var o = ctx.createOscillator(); o.frequency.setValueAtTime(f0 * 1.4, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.04); o.connect(g); o.start(t); o.stop(t + 0.25); }
  function kick(t) { var g = ctx.createGain(); g.connect(bus); env(g, t, 0.003, 0.4, 0.28); var o = ctx.createOscillator(); o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.2); o.connect(g); o.start(t); o.stop(t + 0.35); }
  function pluck(m, t, vol, bright) {
    var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(bright ? 4200 : 2800, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.3); f.Q.value = 2;
    f.connect(g); g.connect(bus); env(g, t, 0.003, vol, 0.38);
    osc("sawtooth", hz(m), t, 0.45, f, -4); osc("triangle", hz(m), t, 0.45, f, 4);
  }
  function bass(m, t) { var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 380; f.connect(g); g.connect(bus); env(g, t, 0.008, 0.22, 0.42); osc("triangle", hz(m), t, 0.5, f); osc("sine", hz(m), t, 0.5, g); }
  function pad(ch, t, dur) {
    ch.tones.forEach(function (m, k) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1100;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
      f.connect(g); g.connect(bus); osc("sawtooth", hz(m), t, dur + 0.7, f, -6 + k * 3); osc("sawtooth", hz(m), t, dur + 0.7, f, 6 - k * 3);
    });
  }
  function horn(m, t, dur) {
    var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(2400, t + 0.06); f.frequency.linearRampToValueAtTime(1400, t + dur);
    f.connect(g); g.connect(bus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.04); g.gain.setValueAtTime(0.05, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    osc("sawtooth", hz(m), t, dur + 0.2, f, -5); osc("sawtooth", hz(m - 12), t, dur + 0.2, f, 5); osc("sawtooth", hz(m + 4), t, dur + 0.2, f, 0);
  }

  function schedule() {
    while (nextT < ctx.currentTime + 0.14) {
      var s = step % 12, bar = Math.floor(step / 12), ch = chords[Math.floor(bar / 2) % 4], phrase = bar % 8;
      var intro = bar < 2;
      if (BELL[s]) bell(nextT, s === 0 || s === 7);
      noise(nextT, 7000, s % 3 === 0 ? 0.05 : 0.022, 0.05);                      // shekere
      if (!intro) {
        if (s === 0 || s === 6) kick(nextT);
        if (s === 3 || s === 9) conga(nextT, 210, 0.12);
        if (s === 5 || s === 11) conga(nextT, 300, 0.08);
        if (BASS[s] != null) bass(ch.root + BASS[s], nextT);
        if (GTR1[s] != null) pluck(ch.tones[GTR1[s]] + 12, nextT, 0.05, true);
        if (GTR2[s] != null && bar > 3) pluck(ch.tones[GTR2[s]], nextT, 0.04, false);
        if (s === 0 && bar % 2 === 0) pad(ch, nextT, STEP * 24);
        // Talking drum: a call at the end of every second bar, answered a bar later.
        if (bar % 2 === 1 && (s === 7 || s === 9 || s === 10)) talking(nextT, s === 10 ? 260 : 200, s === 10 ? 150 : 120, 0.2);
        if (phrase === 4 && s === 2) talking(nextT, 320, 170, 0.16);
        if (phrase === 7) HORN.forEach(function (h) { if (h[0] === s) horn(h[1], nextT, h[2] * STEP); });
      }
      nextT += STEP; step++;
    }
  }

  window.AriyaScore = {
    start: function () {
      try { if (!ctx) build(); ctx.resume(); } catch (e) { return false; }
      on = true;
      if (MUSIC_URL && !fileFailed) {
        // Try the recording first; fall back to the generated groove if it is missing or won't play.
        var fallback = function () { if (fileFailed) return; fileFailed = true; audioEl = null; if (on) window.AriyaScore.start(); };
        if (!audioEl) { audioEl = new Audio(MUSIC_URL); audioEl.loop = true; audioEl.volume = 0.75; audioEl.addEventListener("error", fallback); }
        // Fade the song in rather than starting at full volume.
        audioEl.volume = 0; var v0 = performance.now();
        (function fade() { if (!audioEl || !on) return; var k = Math.min(1, (performance.now() - v0) / 1600); audioEl.volume = 0.75 * k; if (k < 1) requestAnimationFrame(fade); })();
        var p = audioEl.play(); if (p && p.catch) p.catch(function (e) { if (e && e.name !== "AbortError") fallback(); });
        master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.8, ctx.currentTime, 0.2); // for the seal and chime sounds
        return true;
      }
      if (!timer) { nextT = ctx.currentTime + 0.08; step = 0; timer = setInterval(schedule, 25); }
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.8, ctx.currentTime, 0.6);
      on = true; return true;
    },
    stop: function () {
      on = false;
      if (audioEl) audioEl.pause();
      if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    },
    isOn: function () { return on; },
    // Little sounds for interactions; silent unless the music is on.
    crack: function () {
      if (!on || !ctx) return; var t = ctx.currentTime;
      noise(t, 1200, 0.35, 0.05, true); noise(t + 0.03, 2600, 0.25, 0.04, true); noise(t + 0.07, 900, 0.18, 0.08, true);
    },
    chime: function () {
      if (!on || !ctx) return; var t = ctx.currentTime;
      [72, 77, 81, 84].forEach(function (m, i) { pluck(m, t + i * 0.08, 0.08, true); bell(t + i * 0.08, true); });
    },
    pause: function (yes) { if (audioEl) { if (yes) audioEl.pause(); else if (on) audioEl.play(); } if (ctx) { if (yes) ctx.suspend(); else if (on) ctx.resume(); } }
  };
  document.addEventListener("visibilitychange", function () { window.AriyaScore.pause(document.hidden); });
})();
