
/* Story, sound and page. Runs on its own so the page still tells the story if WebGL or the CDN is unavailable.
   The 3D module plugs in through window.OP.render and reports loading through window.OP.loaded. */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function seg(p, a, b) { return smooth((p - a) / (b - a)); }
  function bump(p, a, b, c, d) { return seg(p, a, b) * (1 - seg(p, c, d)); }
  var PRO = 0.004; // the gate leads straight into the opening // share of the scroll given to the prologue
  // The story map. The original eight chapters run on "p" (0 to 1, the box to the dance); two newer chapters are cut in
  // between them, each with its own 0 to 1 progress: C, the colour (after the yes) and D, the send-off (after the dance).
  // s is the reader's progress through the whole story after the prologue.
  // Newer chapters, cut in the same way: E, Mama's room (after the noise); F, her name on Tunde's laptop (after the
  // calm); T, the place kept at Table 1 (after the count). G, the weave: aso-oke rolls tagged with names (after the
  // colour); H, the morning: a place setting close up, before the doors open (before the place kept).
  var SEGS = [["R", 0.2], ["M", 0.12], ["N", 0.68], ["old", 0.1, 0.285], ["C", 0.13], ["G", 0.11], ["old", 0.285, 0.475], ["E", 0.24], ["old", 0.475, 0.62], ["F", 0.12], ["old", 0.62, 0.675], ["W", 0.1], ["old", 0.675, 0.885], ["J", 0.11], ["H", 0.1], ["T", 0.09], ["old", 0.885, 1], ["D", 0.19]];
  var CUTS = [], acc = 0, lastP = 0;
  SEGS.forEach(function (g) {
    var old = g[0] === "old", w = old ? 0.68 * (g[2] - g[1]) : g[1];
    CUTS.push({ a: acc, b: acc + w, mode: g[0], p0: old ? g[1] : lastP, p1: old ? g[2] : lastP });
    if (old) lastP = g[2]; acc += w;
  });
  CUTS.forEach(function (c) { c.a /= acc; c.b /= acc; });
  var CUT_W = 0.011; // half-width of the dip to black at a cut, in s
  // The designed pace: the seconds each cut takes when the film plays itself (Watch runs at exactly this). A gentle
  // scroll runs each cut in SCROLL_SECONDS / SCROLL_PACE, so every caption and detail has its time; scrolling harder
  // skims up to four times faster (assets/scroll.js), so the whole film can pass in under half a minute.
  // Watch runs to the song's clock and lasts FILM_SECONDS: every cut keeps its share, scaled to two minutes. The song
  // (assets/music.mp3, 2:44) starts with the film and plays on, low, under the page once the film has ended.
  // Scrolling keeps its own timings: brisker than Watch, about 1:50 end to end at the gentlest pace.
  var FILM_SECONDS = 120;
  var SEG_SECONDS = [9, 7, 34, 10, 7, 7, 8, 11, 7, 7, 4, 6, 11, 8, 6, 6, 8, 8];
  var SCROLL_SECONDS = [6, 5, 15, 7, 5, 5, 6, 7, 5, 5, 3.5, 4.5, 7, 6, 4.5, 4.5, 6, 7], SCROLL_PACE = 1, TT = 0;
  var segSum = SEG_SECONDS.reduce(function (a, b) { return a + b; }, 0);
  CUTS.forEach(function (c, i) { c.t0 = TT; TT += SEG_SECONDS[i] * FILM_SECONDS / segSum; c.t1 = TT; c.scrollSec = SCROLL_SECONDS[i]; });
  function tFromS(sv) { for (var i = 0; i < CUTS.length; i++) { var c = CUTS[i]; if (sv <= c.b) return c.t0 + (c.t1 - c.t0) * Math.max(0, Math.min(1, (sv - c.a) / (c.b - c.a))); } return TT; }
  function sFromT(t) { for (var i = 0; i < CUTS.length; i++) { var c = CUTS[i]; if (t <= c.t1) return c.a + (c.b - c.a) * Math.max(0, Math.min(1, (t - c.t0) / (c.t1 - c.t0))); } return 1; }
  function mapStory(sv) {
    var c = CUTS[CUTS.length - 1], ci = CUTS.length - 1;
    for (var i = 0; i < CUTS.length; i++) if (sv <= CUTS[i].b) { c = CUTS[i]; ci = i; break; }
    var k = c.b > c.a ? Math.max(0, Math.min(1, (sv - c.a) / (c.b - c.a))) : 0;
    var near = 1;
    for (var j = 1; j < CUTS.length; j++) near = Math.min(near, Math.abs(sv - CUTS[j].a) / CUT_W);
    var dip = near < 1 ? 1 - near * near * (3 - 2 * near) : 0;
    // No dip to black at a cut: the picture dissolves from one shot into the next (see the camera); words still ease out.
    return { mode: c.mode, p: c.p0 + (c.p1 - c.p0) * k, local: k, fade: 0, vis: 1 - dip, cut: ci };
  }
  function sFromOld(p) {
    for (var i = 0; i < CUTS.length; i++) { var c = CUTS[i]; if (c.mode === "old" && p <= c.p1) return c.a + (c.b - c.a) * Math.max(0, (p - c.p0) / (c.p1 - c.p0)); }
    return CUTS[CUTS.length - 2].b;
  }
  function sFromScene(mode, k) { for (var i = 0; i < CUTS.length; i++) if (CUTS[i].mode === mode) return CUTS[i].a + (CUTS[i].b - CUTS[i].a) * k; return 0; }
  function rawFromS(sv) { return PRO + sv * (1 - PRO); }
  window.OPmap = { sFromScene: sFromScene, sFromOld: sFromOld, rawFromS: rawFromS, tFromS: tFromS, seconds: TT };
  // A stable viewport height: the screen with the phone's address bar tucked away (100lvh). window.innerHeight changes
  // every time the address bar slides in or out, which on a top-level page (not in a frame) is on most scrolls; sizing
  // the film and its scroll progress by it made the picture flash and the story jump.
  var vhProbe = document.createElement("div");
  vhProbe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(vhProbe);
  var vhCached = 0;
  window.addEventListener("resize", function () { vhCached = 0; }); // measured again when next asked, not every frame
  function stableVh() { return vhCached || (vhCached = vhProbe.offsetHeight || window.innerHeight); }
  var OP = window.OP = { vh: stableVh, scene: { mode: "old", local: 0, fade: 0, vis: 1 }, p: 0, raw: 0, pro: 0, seated: 0, loaded: 0, entered: false, covered: false, reduceMotion: reduceMotion, render: null, seg: seg, bump: bump, smooth: smooth, clamp: clamp };
  // Embed mode: the landing page hosts the live scene. No gate, no sound, no scroll; the host drives it.
  var EMBED = new URLSearchParams(location.search).get("embed");
  if (EMBED !== "hero" && EMBED !== "hall") EMBED = null;
  OP.embed = EMBED; OP.paused = false;
  // The colour of the day: from the link, or the visitor's last choice, or burgundy. Chosen on the gate.
  var HUES = { burgundy: ["Burgundy", "gold."], blue: ["Sapphire", "gold."], green: ["Green", "champagne."], ruby: ["Ruby", "gold."], coral: ["Coral", "gold."] };
  var savedHue = null; try { savedHue = localStorage.getItem("ariya-colour"); } catch (e) { /* private mode */ }
  OP.velvet = new URLSearchParams(location.search).get("velvet") || (HUES[savedHue] ? savedHue : "burgundy");
  function setHue(name) {
    OP.velvet = name; document.documentElement.setAttribute("data-velvet", name);
    var w = HUES[name] || HUES.burgundy; document.getElementById("hueA").textContent = w[0]; document.getElementById("hueB").textContent = w[1];
    var r = document.querySelector('#hue input[value="' + name + '"]'); if (r) r.checked = true;
  }
  setHue(OP.velvet);
  document.getElementById("hue").addEventListener("change", function (e) {
    if (!e.target || e.target.name !== "hue") return;
    setHue(e.target.value);
    try { localStorage.setItem("ariya-colour", e.target.value); } catch (err) { /* fine */ }
  });
  if (window.FineCard) document.getElementById("seal").innerHTML = FineCard.seal({ initials: "C T" });
  var embedP = EMBED === "hall" ? 0.79 : 0, embedT0 = 0, readySent = false, frames = 0;
  if (EMBED) {
    document.documentElement.classList.add("embed");
    OP.entered = true;
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== "ariya-stage") return;
      if (typeof e.data.visible === "boolean") OP.paused = !e.data.visible;
      if (typeof e.data.p === "number") embedP = clamp(e.data.p, 0, 1);
      if (typeof e.data.velvet === "string") OP.velvet = e.data.velvet;
    });
  }
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  function toTop() { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }
  toTop();
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  window.addEventListener("load", toTop);
  window.addEventListener("pageshow", function (e) { if (e.persisted) location.reload(); });
  if (!EMBED) document.documentElement.classList.add("locked");
  // The whole film is scroll-driven, so all of it plays at the slower pace.
  // Scrolling follows the designed pace of whichever part of the film is on screen; below the film, the planning
  // pages read at an ordinary pace. While Watch is on, scrolling input is held and a hint says how to take over.
  function paceAt(y) {
    var total = track.offsetHeight - stableVh(), r = total > 0 ? y / total : 1;
    if (r >= 1) return 0.9 * window.innerHeight;
    if (r < PRO) return 0.5 * window.innerHeight;
    var sv = (r - PRO) / (1 - PRO), c = CUTS[CUTS.length - 1];
    for (var i = 0; i < CUTS.length; i++) if (sv <= CUTS[i].b) { c = CUTS[i]; break; }
    return Math.max(40, (c.b - c.a) * (1 - PRO) * total / c.scrollSec * SCROLL_PACE);
  }
  if (!EMBED && window.AriyaScroll) AriyaScroll.init({ speedAt: paceAt, lock: watchLock, onLocked: lockHint });

  /* ---------- Score: the song (assets/music.mp3, "Yori Yori" by Abefe, served publicly by the owner's choice), with a generated
     highlife-ambient soundtrack that follows the story as the fallback if the song is missing or won't play ---------- */
  var Score = (function () {
    var ctx = null, master, bus, tone, verb, comp, timer = null, nextT = 0, step = 0, on = false, noiseBuf;
    var SONG = "assets/music.mp3", song = null, songFailed = false, songLoop = true, songChecked = false, songSrc = SONG, lastSeek = 0;
    // Fetch the whole song while the hall is being set, and play it from memory: streaming it on a phone stalls to
    // buffer mid-song, and the stalls are what made it stutter. If it isn't ready by the door, it streams as before.
    try {
      fetch(SONG, { priority: "low" }).then(function (r) {
        if (!r.ok || /text\/html/.test(r.headers.get("content-type") || "")) throw new Error("no song");
        return r.blob();
      }).then(function (b) { if (!song) songSrc = URL.createObjectURL(b); }).catch(function () { /* playSong's own check falls back */ });
    } catch (e) { /* streams instead */ }
    function playSong() {
      var fallback = function () { if (songFailed) return; songFailed = true; song = null; if (on) { on = false; Score.start(); } };
      if (!song) { song = new Audio(songSrc); song.loop = songLoop; song.preload = "auto"; }
      if (!songChecked) {
        songChecked = true; song.addEventListener("error", fallback);
        // A missing file does not always raise "error" (some browsers just keep loading), so ask for it once and fall back if it is not there.
        try { fetch(SONG, { method: "HEAD" }).then(function (r) { if (!r.ok || /text\/html/.test(r.headers.get("content-type") || "")) fallback(); }, fallback); } catch (e) { /* the error event still covers it */ }
      }
      song.volume = 0; var v0 = performance.now();
      (function fade() { if (!song || !on) return; var k = Math.min(1, (performance.now() - v0) / 1800); song.volume = 0.55 * k * levelNow; if (k < 1) requestAnimationFrame(fade); })();
      var pr = song.play(); if (pr && pr.catch) pr.catch(function (e) { if (e && e.name !== "AbortError") fallback(); });
    }
    // Sound design for the opening, all synthesised: no recorded dialogue is used anywhere in the film.
    var levelNow = 1, levelTarget = 1, sfxBus = null, amb = null;
    function sfxOut() { if (!sfxBus) { sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(ctx.destination); } return sfxBus; }
    function noise(t, dur, type, f, q, peak, a) {
      var src = ctx.createBufferSource(); src.buffer = noiseBuf; var fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      var g = ctx.createGain(); src.connect(fl); fl.connect(g); g.connect(sfxOut());
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + (a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.start(t, Math.random() * 0.3, dur + 0.05);
    }
    var SFX = {
      paper: function (t) { for (var i = 0; i < 5; i++) noise(t + i * 0.07 + Math.random() * 0.04, 0.09 + Math.random() * 0.06, "bandpass", 2600 + Math.random() * 1800, 0.9, 0.05, 0.005); },
      breath: function (t) { noise(t, 0.9, "bandpass", 620, 0.7, 0.025, 0.35); },
      chair: function (t) { noise(t, 0.45, "lowpass", 380, 0.6, 0.06, 0.05); noise(t + 0.32, 0.12, "lowpass", 160, 0.8, 0.07, 0.005); },
      fabric: function (t) { noise(t, 0.5, "bandpass", 1500, 0.4, 0.03, 0.12); },
      set: function (t) { var g = ctx.createGain(); g.connect(sfxOut()); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); var o = ctx.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12); o.connect(g); o.start(t); o.stop(t + 0.2); noise(t, 0.03, "highpass", 2400, 0.7, 0.03, 0.002); },
      hinge: function (t) { for (var i = 0; i < 7; i++) noise(t + i * 0.035, 0.03, "bandpass", 3200 - i * 140, 6, 0.02, 0.003); var g = ctx.createGain(); g.connect(sfxOut()); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); var o = ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(820, t); o.frequency.linearRampToValueAtTime(690, t + 0.28); o.connect(g); o.start(t); o.stop(t + 0.32); },
      clink: function (t) { [2350, 3120, 4180].forEach(function (f, k) { var g = ctx.createGain(); g.connect(sfxOut()); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03 / (k + 1), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); var o = ctx.createOscillator(); o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 1); }); },
      tick: function (t) { noise(t, 0.02, "highpass", 3800, 0.7, 0.018, 0.001); }
    };
    // Room tone, a clock for Tunde's room, the murmur of a party for the memory.
    function ambience(kind) {
      if (!ctx || !on) kind = "";
      if (!amb && kind) {
        amb = { src: ctx.createBufferSource(), f: ctx.createBiquadFilter(), g: ctx.createGain(), kind: "", nextTick: 0 };
        var buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        amb.src.buffer = buf; amb.src.loop = true; amb.src.connect(amb.f); amb.f.connect(amb.g); amb.g.connect(sfxOut()); amb.g.gain.value = 0; amb.src.start();
      }
      if (!amb) return;
      if (kind !== amb.kind) {
        amb.kind = kind; var t = ctx.currentTime;
        amb.f.type = kind === "M" ? "bandpass" : "lowpass"; amb.f.frequency.setTargetAtTime(kind === "M" ? 520 : 240, t, 0.2); amb.f.Q.value = kind === "M" ? 0.6 : 0.5;
        amb.g.gain.setTargetAtTime(kind === "M" ? 0.05 : kind ? 0.012 : 0, t, 0.4);
      }
      if (kind === "R" && ctx.currentTime > amb.nextTick) { amb.nextTick = Math.ceil(ctx.currentTime) + 1; SFX.tick(amb.nextTick); }
      if (kind === "M") amb.g.gain.setTargetAtTime(0.045 + 0.02 * Math.sin(ctx.currentTime * 1.7) * Math.sin(ctx.currentTime * 0.6), ctx.currentTime, 0.3);
    }
    var lv = { pad: 0.7, gtr: 0, bass: 0, perc: 0, drum: 0, bell: 0.3, kick: 0, ping: 0, open: 1 };
    var tg = Object.assign({}, lv);
    var BPM = 100, S16 = 60 / BPM / 4;
    var chords = [
      { root: 41, notes: [53, 57, 60, 64, 67] }, // Fmaj9
      { root: 46, notes: [53, 58, 62, 65, 69] }, // Bbmaj7
      { root: 48, notes: [55, 60, 62, 64, 69] }, // C6/9
      { root: 45, notes: [52, 55, 60, 64, 67] }  // Am7
    ];
    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
    function osc(type, f, t, dur, dest, detune) { var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
    function build() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0;
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
      bus = ctx.createGain();
      tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 16000; tone.Q.value = 0.4;
      verb = ctx.createConvolver();
      var len = ctx.sampleRate * 3.4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
      verb.buffer = ir;
      var wet = ctx.createGain(); wet.gain.value = 0.32;
      bus.connect(tone); tone.connect(comp); tone.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(master); master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      var nd = noiseBuf.getChannelData(0); for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
    }
    function pad(ch, t) {
      if (lv.pad < 0.02) return;
      var bar = S16 * 16;
      ch.notes.forEach(function (m, k) {
        var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900 + 600 * lv.open; f.Q.value = 0.3;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022 * lv.pad, t + 1.4); g.gain.linearRampToValueAtTime(0.018 * lv.pad, t + bar); g.gain.linearRampToValueAtTime(0.0001, t + bar + 1.6);
        f.connect(g); g.connect(bus);
        osc("sawtooth", hz(m), t, bar + 1.7, f, -7 + k); osc("sawtooth", hz(m), t, bar + 1.7, f, 7 - k); osc("sine", hz(m - 12), t, bar + 1.7, g);
      });
    }
    function pluck(m, t, vol) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = 0.7;
      f.connect(g); g.connect(bus); env(g, t, 0.004, vol, 0.42);
      osc("triangle", hz(m), t, 0.5, f); osc("sine", hz(m + 12), t, 0.3, g);
    }
    function bassNote(m, t) { var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420; f.connect(g); g.connect(bus); env(g, t, 0.01, 0.16 * lv.bass, 0.5); osc("triangle", hz(m), t, 0.6, f); osc("sine", hz(m), t, 0.6, f); }
    function shaker(t, acc) { var s = ctx.createBufferSource(); s.buffer = noiseBuf; var f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 6500; var g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(bus); env(g, t, 0.006, (acc ? 0.05 : 0.022) * lv.perc, 0.06); s.start(t, Math.random() * 0.4, 0.1); }
    function talking(t, hi) { var g = ctx.createGain(); g.connect(bus); env(g, t, 0.005, 0.22 * lv.drum, 0.38); var o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(hi ? 260 : 190, t); o.frequency.exponentialRampToValueAtTime(hi ? 150 : 105, t + 0.28); o.connect(g); o.start(t); o.stop(t + 0.45); }
    function bell(t, hi) { var g = ctx.createGain(); g.connect(bus); env(g, t, 0.002, 0.05 * lv.bell, 0.32); var f = hi ? 1046 : 784; osc("sine", f, t, 0.4, g); osc("sine", f * 2.76, t, 0.2, g); }
    function kick(t) { var g = ctx.createGain(); g.connect(bus); env(g, t, 0.003, 0.32 * lv.kick, 0.3); var o = ctx.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22); o.connect(g); o.start(t); o.stop(t + 0.4); }
    function ping(t) { var g = ctx.createGain(); g.connect(bus); env(g, t, 0.003, 0.05 * lv.ping, 0.22); osc("sine", 1318, t, 0.12, g); var g2 = ctx.createGain(); g2.connect(bus); env(g2, t + 0.09, 0.003, 0.045 * lv.ping, 0.3); osc("sine", 1760, t + 0.09, 0.35, g2); }
    var gtrSteps = { 0: 2, 3: 4, 6: 3, 8: 1, 10: 4, 12: 2, 14: 3 }, bellSteps = { 0: 1, 3: 0, 6: 1, 10: 0, 12: 0 }, drumSteps = { 4: 1, 7: 0, 12: 1, 14: 0 };
    function schedule() {
      for (var k in tg) lv[k] += (tg[k] - lv[k]) * 0.04;
      tone.frequency.setTargetAtTime(1200 + 15000 * lv.open * lv.open, ctx.currentTime, 0.4);
      while (nextT < ctx.currentTime + 0.12) {
        var s = step % 16, bar = Math.floor(step / 16), ch = chords[bar % 4];
        if (s === 0) pad(ch, nextT);
        if (lv.gtr > 0.02 && gtrSteps[s] !== undefined) pluck(ch.notes[gtrSteps[s]] + 12, nextT, 0.07 * lv.gtr);
        if (lv.bass > 0.02 && (s === 0 || s === 6 || s === 10)) bassNote(s === 6 ? ch.root + 7 : ch.root, nextT);
        if (lv.perc > 0.02) shaker(nextT, s % 4 === 2);
        if (lv.bell > 0.02 && bellSteps[s] !== undefined) bell(nextT, bellSteps[s]);
        if (lv.drum > 0.02 && drumSteps[s] !== undefined && (bar % 2 || s < 10)) talking(nextT, drumSteps[s]);
        if (lv.kick > 0.02 && (s === 0 || s === 8)) kick(nextT);
        if (lv.ping > 0.05 && Math.random() < 0.09 * lv.ping) ping(nextT + Math.random() * S16);
        nextT += S16; step++;
      }
    }
    return {
      start: function (at) {
        try { if (!ctx) build(); ctx.resume(); } catch (e) { return false; }
        on = true;
        if (at > 0 && !song && !songFailed) { song = new Audio(songSrc); song.loop = songLoop; song.preload = "auto"; song.addEventListener("loadedmetadata", function () { song.currentTime = at % (song.duration || 1e9); }, { once: true }); }
        master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.85, ctx.currentTime, 0.3); // chimes over the song
        if (!songFailed) { playSong(); return true; }
        if (!timer) { nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 25); }
        master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.85, ctx.currentTime, 1.2);
        on = true; return true;
      },
      stop: function () { on = false; if (song) song.pause(); if (!ctx) return; master.gain.setTargetAtTime(0, ctx.currentTime, 0.4); },
      isOn: function () { return on; },
      time: function () { return song ? song.currentTime : 0; },
      // Watch keeps time by the song: its position while it is really playing, and a way to move it with the film.
      clock: function () { return song && on && !song.paused && song.readyState >= 2 ? song.currentTime : null; },
      // Moving the song makes it stop and pick up again, so it moves only for a real jump: never for a small difference, never twice in a moment.
      seek: function (t) {
        if (!song) return;
        var now = performance.now();
        if (Math.abs(song.currentTime - t) < 0.4 || now - lastSeek < 350) return;
        lastSeek = now; try { song.currentTime = Math.max(0, t); } catch (e) { /* not loaded yet */ }
      },
      // The song is playing but waiting for data: Watch holds the picture rather than run ahead of it.
      waiting: function () { return !!(song && on && !songFailed && !song.paused && song.readyState < 3); },
      // In Watch the song plays once and ends with the film; scrolling, it goes round again.
      loop: function (v) { songLoop = v; if (song) song.loop = v; },
      restart: function () { if (song) { try { song.currentTime = 0; } catch (e) { /* not loaded yet */ } } step = 0; },
      sfx: function (name) { if (!on || !ctx || !SFX[name]) return; try { SFX[name](ctx.currentTime + 0.01); } catch (e) { /* a missed sound is fine */ } },
      ambience: function (kind) { try { ambience(kind); } catch (e) { /* fine */ } },
      // The score sits under the dialogue until the yes, then rises.
      level: function (l) {
        levelTarget = l; levelNow += (levelTarget - levelNow) * (levelTarget > levelNow ? 0.015 : 0.08);
        if (song && on && !song.paused) { var v = Math.max(0, Math.min(1, 0.55 * levelNow)); if (Math.abs(song.volume - v) > 0.01) song.volume = v; }
        else if (ctx && on && timer) master.gain.setTargetAtTime(0.85 * levelNow, ctx.currentTime, 0.2);
      },
      chime: function () { if (!on) return; var t = ctx.currentTime; [72, 76, 79, 84].forEach(function (m, i) { pluck(m, t + i * 0.09, 0.09); }); },
      scene: function (p, pro) {
        var T = { pad: 0.7, gtr: 0, bass: 0, perc: 0, drum: 0, bell: 0.25, kick: 0, ping: 0, open: 1 };
        if (pro >= 1) {
          if (p < 0.12) { T.pad = 1; T.gtr = 0.35; T.bell = 0.4; }
          else if (p < 0.29) { T.pad = 1; T.gtr = 1; T.bass = 0.6; T.bell = 0.5; }
          else if (p < 0.47) { T.pad = 0.55; T.gtr = 0.4; T.perc = 0.5; T.ping = 1; T.open = 0.25; T.bell = 0; }
          else if (p < 0.62) { T.pad = 1; T.gtr = 0.15; T.bell = 0.25; }
          else if (p < 0.78) { T.pad = 1; T.gtr = 0.6; T.bass = 0.5; T.bell = 0.5; }
          else if (p < 0.89) { T.pad = 0.8; T.gtr = 1; T.bass = 1; T.perc = 0.8; T.drum = 0.6; T.bell = 0.6; }
          else { T.pad = 0.7; T.gtr = 1; T.bass = 1; T.perc = 1; T.drum = 1; T.bell = 0.8; T.kick = 1; }
        }
        tg = T;
      },
      suspend: function (yes) {
        if (song) { if (yes) song.pause(); else if (on) song.play().catch(function () {}); }
        if (ctx) { if (yes) ctx.suspend(); else if (on) ctx.resume(); }
      }
    };
  })();
  document.addEventListener("visibilitychange", function () { Score.suspend(document.hidden || songHeld()); });
  // Music carries across pages: the shared navigation hands the song's position to the next page.
  window.AriyaScore = { handoff: function () { try { sessionStorage.setItem("ariya-music", JSON.stringify({ on: Score.isOn(), t: Score.time() })); } catch (e) { /* none */ } } };
  var musicFrom = null;
  try { musicFrom = JSON.parse(sessionStorage.getItem("ariya-music") || "null"); sessionStorage.removeItem("ariya-music"); } catch (e) { /* none */ }

  var soundBtn = document.getElementById("soundBtn");
  function setSound(onOff) {
    var ok = onOff ? Score.start(musicFrom && musicFrom.on ? musicFrom.t : 0) : (Score.stop(), false);
    musicFrom = null;
    soundBtn.classList.toggle("sound-on", !!ok);
    soundBtn.setAttribute("aria-pressed", ok ? "true" : "false");
    soundBtn.querySelector(".lbl").textContent = ok ? "Sound on" : "Sound off";
  }
  soundBtn.addEventListener("click", function () { setSound(!Score.isOn()); });

  /* ---------- Gate ---------- */
  var gate = document.getElementById("gate"), enterSound = document.getElementById("enterSound");
  var loadBar = document.getElementById("loadBar"), loadTxt = document.getElementById("loadTxt");
  var gateStart = performance.now();
  var howEl = document.getElementById("how"), choosing = false, wantSound = false;
  // The door asks for sound or silence; the song itself only starts once the visitor chooses to scroll or to watch.
  function enter(withSound, choice) {
    if (OP.entered) return;
    if (!choice) { wantSound = withSound; choosing = true; gate.classList.add("choose"); howEl.hidden = false; document.getElementById("howScroll").focus(); return; }
    setSound(choosing ? wantSound : withSound);
    toTop(); target = prog = 0;
    OP.entered = true;
    gate.classList.add("gone");
    document.documentElement.classList.remove("locked");
    setTimeout(function () { gate.hidden = true; }, 1500);
    setHow(choice === "watch" ? "watch" : "scroll", reduceMotion ? 300 : 1200);
  }
  enterSound.addEventListener("click", function () { enter(true); });
  document.getElementById("enterQuiet").addEventListener("click", function () { enter(false); });
  document.getElementById("howScroll").addEventListener("click", function () { enter(false, "scroll"); });
  document.getElementById("howWatch").addEventListener("click", function () { enter(false, "watch"); });
  function gateTick() {
    if (OP.entered) return;
    // Let people in once the hall is built, or after a while without WebGL.
    var waited = (performance.now() - gateStart) / 1000;
    var shown = OP.loaded > 0 ? OP.loaded : Math.min(0.9, waited / 12);
    loadBar.style.transform = "scaleX(" + shown.toFixed(3) + ")";
    var ready = OP.loaded >= 1 || OP.failed || waited > 14;
    loadTxt.textContent = ready ? "The hall is ready" : "Setting the hall " + Math.round(shown * 100) + "%";
    enterSound.disabled = !ready;
    requestAnimationFrame(gateTick);
  }
  requestAnimationFrame(gateTick);

  /* ---------- Scroll progress ---------- */
  var track = document.getElementById("track");
  var target = 0, prog = 0;
  function nativeProgress() {
    var total = track.offsetHeight - stableVh();
    return total > 0 ? clamp(window.scrollY / total, 0, 1) : 0;
  }
  window.addEventListener("scroll", function () { target = nativeProgress(); }, { passive: true });
  window.addEventListener("resize", function () { target = nativeProgress(); });
  target = prog = nativeProgress();
  OP.snap = function () { target = prog = nativeProgress(); }; // for tests: jump the story straight to the scroll position
  function scrollToRaw(r) {
    var total = track.offsetHeight - stableVh();
    if (window.AriyaScroll && AriyaScroll.enabled) AriyaScroll.to(r * total);
    else window.scrollTo({ top: r * total, behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---------- Chapters: the nav label and the menu's chapter index ---------- */
  // [name, story position s] ; the prologue is -1 (the very top).
  var chapters = [["The words", -1], ["Where it began", sFromScene("M", 0)], ["The question", sFromScene("N", 0)], ["The colour", sFromScene("C", 0)], ["The weave", sFromScene("G", 0.02)], ["The noise", sFromOld(0.37)],
    ["Mama", sFromScene("E", 0.02)], ["The calm", sFromOld(0.53)], ["Her name", sFromScene("F", 0.02)], ["The doors", sFromScene("W", 0.0)], ["The invitation", sFromOld(0.72)], ["The count", sFromOld(0.83)],
    ["Getting ready", sFromScene("J", 0.02)], ["The morning", sFromScene("H", 0.02)], ["The place kept", sFromScene("T", 0.02)], ["The dance", sFromOld(0.97)], ["The send-off", sFromScene("D", 0.02)]];
  var whereNo = document.getElementById("whereNo"), whereName = document.getElementById("whereName");
  // The rail: one mark per chapter, the current one in gold; each mark jumps to its chapter.
  var railBtns = chapters.map(function (c, i) {
    var li = document.createElement("li"), b = document.createElement("button");
    b.type = "button"; b.innerHTML = "<span>" + c[0] + "</span><i></i>"; b.setAttribute("aria-label", "Chapter " + i + ": " + c[0]);
    b.addEventListener("click", function () { if (!OP.entered) enter(false, "scroll"); scrollToRaw(c[1] < 0 ? 0 : rawFromS(c[1])); });
    li.appendChild(b); document.getElementById("railList").appendChild(li); return b;
  });
  if (!EMBED && window.AriyaNav) AriyaNav.init({ chapters: chapters.map(function (c) {
    return [c[0], function () { if (!OP.entered) enter(false, "scroll"); scrollToRaw(c[1] < 0 ? 0 : rawFromS(c[1])); }];
  }) });
  document.getElementById("home").addEventListener("click", function (e) { e.preventDefault(); scrollToRaw(0); });
  document.getElementById("replay").addEventListener("click", function () { replayFilm(); });
  Array.prototype.forEach.call(document.querySelectorAll('a[href="#start"]'), function (a) {
    a.addEventListener("click", function () { if (!OP.entered) enter(false, "scroll"); });
  });


  /* ---------- Text beats ---------- */
  var beats = Array.prototype.map.call(document.querySelectorAll(".beat"), function (el) {
    var raw = el.dataset.rawIn !== undefined;
    return { el: el, raw: raw, scene: el.dataset.scene || null, a: parseFloat(raw ? el.dataset.rawIn : el.dataset.in), b: parseFloat(raw ? el.dataset.rawOut : el.dataset.out), base: el.classList.contains("low") ? "" : "translateY(-50%) " };
  });

  /* ---------- The noise: message storm, each bubble at its own depth ---------- */
  var msgs = [
    ["Aunty Bisi", "Is it 300 or 450 people now??"], ["Femi", "Pls add my cousin to the group"], ["Mummy C", "My church members are coming o. All of them."],
    ["Kemi (planner)", "Who has the final list? Anybody?"], ["Tolu", "I didn't get invite o"], ["Uncle Dayo", "Which table am I?"],
    ["Ngozi", "Send the aso ebi account number again"], ["Aunty Bisi", "Me and my 4 children will be there"], ["Seun", "Is the reception in VI or Lekki?"],
    ["Caterer", "How many plates did we agree?"], ["Femi", "RSVP to who exactly?"], ["Mummy C", "Add Mrs Okafor. And her sister."],
    ["Kemi (planner)", "Please stop sending names in the group"], ["Tunde", "Babe I think we've lost count"]
  ];
  var storm = document.getElementById("storm");
  var rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(7);
  var bubbles = msgs.map(function (m, i) {
    var el = document.createElement("div");
    el.className = "bub";
    var hh = 14 + Math.floor(i / 3), mm = (i * 7 + 3) % 60;
    el.innerHTML = "<b>" + m[0] + "</b>" + m[1] + "<i>" + hh + ":" + (mm < 10 ? "0" : "") + mm + "</i>";
    var x = 2 + (i % 3) * 28 + rnd() * 16, y = 16 + Math.floor(i / 3) * 10 + rnd() * 6;
    el.style.left = x + "%"; el.style.top = y + "%";
    var z = rnd();
    el.style.zIndex = String(Math.round(z * 10));
    storm.appendChild(el);
    var ang = Math.atan2(y - 50, x + 10 - 50);
    return { el: el, at: 0.3 + i * 0.0105, z: z, dx: Math.cos(ang), dy: Math.sin(ang), rot: (rnd() - 0.5) * 70, tilt: (rnd() - 0.5) * 8 };
  });
  var groupbar = document.getElementById("groupbar"), unread = document.getElementById("unread");

  /* ---------- The invitation envelope ---------- */
  var envwrap = document.getElementById("envwrap"), env = document.getElementById("env"), card = document.getElementById("card");
  var nameEl = document.getElementById("guestName"), who = document.getElementById("who"), toName = document.getElementById("toName"), reply = document.getElementById("reply");
  var envOpen = false, envTimer = null;
  function openEnv() {
    if (envOpen) return;
    envOpen = true; env.classList.add("open");
    clearTimeout(envTimer); envTimer = setTimeout(function () { env.classList.add("out"); }, 1700);
  }
  function closeEnv() { if (!envOpen) return; envOpen = false; clearTimeout(envTimer); env.classList.remove("open", "out"); }
  document.getElementById("seal").addEventListener("click", openEnv);
  function guest() { return (nameEl.value || "").trim() || "Guest"; }
  nameEl.addEventListener("input", function () { who.textContent = guest(); toName.textContent = guest(); });
  document.getElementById("yes").addEventListener("click", function (e) {
    reply.textContent = "You’re on the list, " + guest() + ". The couple will keep your place. A confirmation is on its way.";
    var r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top); Score.chime();
  });
  document.getElementById("no").addEventListener("click", function () {
    reply.textContent = "Thank you, " + guest() + ". The couple will see your reply straight away.";
  });
  var tiltX = 0, tiltY = 0, tiltTX = 0, tiltTY = 0;
  envwrap.addEventListener("pointermove", function (e) {
    if (reduceMotion || e.pointerType !== "mouse") return;
    var r = envwrap.getBoundingClientRect();
    var u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    tiltTX = clamp((u - 0.5) * 2, -1, 1); tiltTY = clamp((v - 0.5) * 2, -1, 1);
    card.style.setProperty("--sx", (u * 100).toFixed(1) + "%"); card.style.setProperty("--sy", (v * 100).toFixed(1) + "%");
  });
  envwrap.addEventListener("pointerleave", function () { tiltTX = tiltTY = 0; });

  // Live guest list shown during the count
  var guestData = [["Aunty Bisi + 4", "Table 3"], ["Mr & Mrs Okafor", "Table 5"], ["Femi Adeyemi", "Table 12"], ["Ngozi Eze + 1", "Table 7"], ["Uncle Dayo", "Table 1"], ["Kemi (planner)", "Head table"], ["Tolu Bankole", "Table 9"], ["Seun & Ronke", "Table 14"]];
  var guestsEl = document.getElementById("guests");
  var guestRows = guestData.map(function (g) {
    var li = document.createElement("li");
    li.innerHTML = "<span>" + g[0] + "</span><em>" + g[1] + "</em><i>Coming</i>";
    document.getElementById("guestRows").appendChild(li);
    return li;
  });

  var flash = document.getElementById("flash"), bar = document.getElementById("bar"), scrim = document.getElementById("scrim");
  var cConfirmed = document.getElementById("cConfirmed"), cSeated = document.getElementById("cSeated");
  var railEl = document.getElementById("rail"), biz = document.getElementById("biz"), nav = document.getElementById("nav"), footUi = document.getElementById("footUi"), scrollcue = document.getElementById("scrollcue");

  /* ---------- 2D confetti for the RSVP tap ---------- */
  var cv = document.getElementById("confetti"), cx = cv.getContext("2d"), bits = [], bitsOn = false;
  function burst(x, y) {
    if (reduceMotion) return;
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    var cols = ["#e9c98a", "#f4efe6", "#c1283d", "#b8864b"];
    for (var i = 0; i < 160; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2, s = 6 + Math.random() * 10;
      bits.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, w: 4 + Math.random() * 6, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % 4], life: 130 + Math.random() * 60 });
    }
    if (!bitsOn) { bitsOn = true; requestAnimationFrame(stepBits); }
  }
  function stepBits() {
    cx.clearRect(0, 0, cv.width, cv.height);
    bits = bits.filter(function (b) { return b.life > 0 && b.y < cv.height + 40; });
    bits.forEach(function (b) {
      b.vy += 0.3; b.vx *= 0.985; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life--;
      cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r); cx.globalAlpha = Math.min(1, b.life / 40);
      cx.fillStyle = b.c; cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); cx.restore();
    });
    if (bits.length) requestAnimationFrame(stepBits); else { bitsOn = false; cx.clearRect(0, 0, cv.width, cv.height); }
  }

  /* ---------- DOM updates driven by progress ---------- */
  // Depth of field on the words and messages; only touch the style when the blur actually changes.
  function setBlur(el, px) { var v = px > 0.15 ? "blur(" + px.toFixed(1) + "px)" : "none"; if (el._blur !== v) { el._blur = v; el.style.filter = v; } }
  var lastChapter = -1;
  var oldLayer = document.getElementById("oldLayer"), newLayer = document.getElementById("newLayer");
  // Her name, on Tunde's laptop. The reader sends the invitation; if they just keep scrolling, it sends itself.
  var panel = document.getElementById("panel"), pQuery = document.getElementById("pQuery"), pRow = document.getElementById("pRow");
  var pPill = document.getElementById("pPill"), pBtn = document.getElementById("pBtn"), pNote = document.getElementById("pNote"), pSent = false, pBySelf = false;
  pBtn.addEventListener("click", function () { if (pSent) return; pSent = true; pBySelf = true; Score.chime(); });
  function updatePanel(sc) {
    var u = sc.mode === "F" ? sc.local : -1, vis = u < 0 ? 0 : bump(u, 0.24, 0.32, 0.86, 0.94);
    panel.style.opacity = vis.toFixed(3); panel.classList.toggle("on", vis > 0.05);
    panel.style.transform = "translate(-50%, -50%) translateY(" + ((1 - vis) * 16).toFixed(1) + "px)";
    if (u < 0) return;
    if (u < 0.2) { pSent = false; pBySelf = false; }
    if (!pSent && u > 0.8) pSent = true;
    pQuery.textContent = "Ijeoma".slice(0, Math.floor(seg(u, 0.3, 0.42) * 6.99));
    pRow.classList.toggle("on", u > 0.42);
    pBtn.disabled = pSent || u < 0.45;
    pPill.textContent = pSent ? "Invitation sent" : "Invitation not sent"; pPill.className = "pill " + (pSent ? "sent" : "wait");
    pNote.textContent = pSent ? "Sent by text message, with her own link." : u > 0.45 ? "Tap to send her own invitation." : "";
  }
  /* ---------- The opening: one set of scene definitions drives the captions, the words on screen, the sounds, the
     blackout and the autoplay, whether the visitor watches it play or scrolls through it. ---------- */
  // [scene, from, to, speaker, line, kind]  kind: "sfx" for described sounds (there is no recorded dialogue).
  var OPEN_LINES = [
    ["R", 0.06, 0.29, "Tunde, quietly", "Chidinma… these past five years…"],
    ["R", 0.31, 0.43, "", "[paper rustles]", "sfx"],
    ["R", 0.45, 0.64, "Tunde", "Why does that sound like a graduation speech?"],
    ["R", 0.65, 0.74, "", "[a small, nervous laugh]", "sfx"],
    ["R", 0.76, 0.99, "Tunde", "Since that night at table fourteen…"],
    ["M", 0.1, 0.46, "Chidinma", "That’s enough rice for three people."],
    ["M", 0.48, 0.76, "Tunde", "I’m planning ahead."],
    ["M", 0.77, 0.97, "", "[her laugh]", "sfx"],
    ["N", 0.1, 0.165, "Chidinma", "You kept this?"],
    ["N", 0.17, 0.24, "Tunde", "Of course."],
    ["N", 0.27, 0.315, "Tunde", "Close your eyes."],
    ["N", 0.32, 0.37, "Chidinma, amused", "Tunde… what are you doing?"],
    ["N", 0.375, 0.41, "Tunde, gently", "Please."],
    ["N", 0.445, 0.475, "", "[a chair moves]", "sfx"],
    ["N", 0.478, 0.505, "", "[fabric, a quiet breath]", "sfx"],
    ["N", 0.508, 0.53, "", "[something small set down on the table]", "sfx"],
    ["N", 0.535, 0.575, "Tunde", "Okay. Open."],
    ["N", 0.69, 0.705, "", "[a soft hinge]", "sfx"],
    ["N", 0.71, 0.75, "Tunde", "I had a whole speech."],
    ["N", 0.755, 0.785, "Chidinma", "I know."],
    ["N", 0.8, 0.84, "Tunde", "Will you marry me?"],
    ["N", 0.86, 0.9, "Chidinma, with a small laugh", "Yes."]
  ];
  var OPEN_SLATES = [["R", 0.0, 0.3, "Tunde’s room · Lagos · late 2026"], ["M", 0.0, 0.95, "Lagos · December 2021"], ["N", 0.0, 0.16, "Five years later · dinner for two"]];
  // After the yes, the ring rises out of its box (L, the old film's p 0.1 to 0.285), then the thread leads on.
  var OPEN_WORDS = [["N", 0.89, 1.01, "It starts with <em>one yes.</em>"], ["L", 0.8, 1.01, "Now tell everyone who <em>helped you get here.</em>"]];
  // Sounds, by the same clock. They only play once the visitor has turned sound on.
  var OPEN_SFX = [["R", 0.31, "paper"], ["R", 0.66, "breath"], ["R", 0.74, "paper"], ["M", 0.52, "clink"], ["N", 0.445, "chair"], ["N", 0.478, "fabric"], ["N", 0.49, "breath"], ["N", 0.508, "set"], ["N", 0.69, "hinge"], ["N", 0.79, "breath"]];
  var openEl = document.getElementById("opening"), slateEl = document.getElementById("slate"), wordsEl = document.getElementById("words"), threadEl = document.getElementById("thread"), threadPath = document.getElementById("threadPath");
  var ccEl = document.getElementById("cc"), ccWho = document.getElementById("ccWho"), ccLine = document.getElementById("ccLine");
  var threadLen = threadPath.getTotalLength ? threadPath.getTotalLength() : 600; threadPath.style.strokeDasharray = threadLen; threadPath.style.strokeDashoffset = threadLen;
  var lastCC = -1, lastWords = -1, lastSlate = -1, sfxMode = "", sfxLocal = 0;
  function inOpening(mode) { return mode === "R" || mode === "M" || mode === "N"; }
  function pick(list, mode, u) { for (var i = 0; i < list.length; i++) if (list[i][0] === mode && u >= list[i][1] && u < list[i][2]) return i; return -1; }
  OP.ccdbg = function () { return { lastCC: lastCC, inline: ccEl.style.opacity, text: ccLine.textContent }; };
  function updateOpening(sc) {
    var m = sc.mode, u = sc.local, open = inOpening(m) && OP.entered;
    var lift = sc.mode === "old" && sc.p >= 0.1 && sc.p < 0.285 && OP.entered, wm = lift ? "L" : m, wu = lift ? (sc.p - 0.1) / 0.185 : u;
    var ci = open && sc.vis > 0.5 ? pick(OPEN_LINES, m, u) : -1;
    if (ci !== lastCC) {
      lastCC = ci;
      if (ci >= 0) { var L = OPEN_LINES[ci]; ccWho.textContent = L[3]; ccLine.textContent = L[4]; ccEl.classList.toggle("sfx", L[5] === "sfx"); }
      ccEl.style.opacity = ci >= 0 ? "1" : "0";
    }
    var wi = open || lift ? pick(OPEN_WORDS, wm, wu) : -1, wk = lift ? 0.05 : 0.012;
    if (wi !== lastWords) { lastWords = wi; if (wi >= 0) wordsEl.innerHTML = OPEN_WORDS[wi][3]; }
    wordsEl.style.opacity = wi >= 0 ? String(Math.min(seg(wu, OPEN_WORDS[wi][1], OPEN_WORDS[wi][1] + wk), 1 - seg(wu, OPEN_WORDS[wi][2] - 0.012, OPEN_WORDS[wi][2]))) : "0";
    var si = open ? pick(OPEN_SLATES, m, u) : -1;
    if (si !== lastSlate) { lastSlate = si; if (si >= 0) slateEl.textContent = OPEN_SLATES[si][3]; }
    slateEl.style.opacity = si >= 0 ? "1" : "0";
    // Close your eyes: the picture fades to black and holds while we only hear, then opens on the same table.
    OP.blackout = m === "N" ? Math.min(seg(u, 0.4, 0.44), 1 - seg(u, 0.555, 0.6)) : 0;
    // The gold of the ring becomes the film's gold thread, drawn across the frame into the next chapter.
    var th = lift ? seg(wu, 0.8, 0.995) : m === "C" ? 1 - seg(u, 0, 0.06) : 0;
    threadEl.style.opacity = (lift ? Math.min(1, th * 3) : th).toFixed(3);
    threadPath.style.strokeDashoffset = (threadLen * (1 - (lift ? th : 1))).toFixed(1);
    openEl.style.visibility = open || lift || th > 0 ? "visible" : "hidden";
    // Sounds: fire each cue once as the story passes it going forward.
    if (open && m === sfxMode) OPEN_SFX.forEach(function (c) { if (c[0] === m && sfxLocal < c[1] && u >= c[1] && u - c[1] < 0.06) Score.sfx(c[2]); });
    sfxMode = m; sfxLocal = u;
    Score.ambience(open ? m : "");
    // The score stays under the voices until she says yes; then it rises. Once the film is over it plays on, low.
    Score.level(open && !(m === "N" && u > 0.88) ? 0.28 : OP.s >= 0.998 || OP.covered ? 0.3 : 1);
  }

  /* ---------- Watch or scroll. Watch plays the whole film by itself at its designed pace, and the song follows it:
     Pause pauses the song, Play carries on, Replay starts both again. Scrolling is the visitor's own, at the designed
     pace, and the song simply plays. While Watch is on, scrolling input is held; "Scroll instead" hands over. ---------- */
  var obar = document.getElementById("obar"), obPlay = document.getElementById("obPlay"), obCC = document.getElementById("obCC");
  var obMode = document.getElementById("obMode"), obSkip = document.getElementById("obSkip"), ohint = document.getElementById("ohint");
  var how = "scroll", playing = false, playLast = 0, playY = -1, wt = 0, startTimer = 0, hintTimer = 0;
  document.getElementById("howMins").textContent = "in " + Math.floor(TT / 60) + ":" + ("0" + Math.round(TT % 60)).slice(-2) + ", to the song";
  function yFromS(sv) { return rawFromS(sv) * (track.offsetHeight - stableVh()); }
  function sFromY(y) { var total = track.offsetHeight - stableVh(); return total > 0 ? clamp((y / total - PRO) / (1 - PRO), 0, 1) : 0; }
  function watchLock() { return how === "watch" && OP.entered; }
  function songHeld() { return how === "watch" && !playing && OP.entered && !startTimer; }
  function lockHint() {
    ohint.textContent = playing ? "Playing by itself. Pause, or choose Scroll to move at your own pace." : "Paused. Press Play, or choose Scroll to move at your own pace.";
    ohint.classList.add("on"); clearTimeout(hintTimer); hintTimer = setTimeout(function () { ohint.classList.remove("on"); }, 2600);
  }
  OP.watch = { set: function (on) { setHow(on ? "watch" : "scroll"); }, get playing() { return playing; }, get how() { return how; }, get songHeld() { return songHeld(); }, get clock() { return Score.clock(); }, get filmTime() { return wt; } };
  function setHow(m, startIn) {
    how = m; clearTimeout(startTimer); startTimer = 0;
    document.documentElement.classList.toggle("watching", m === "watch");
    Score.loop(m !== "watch");
    obPlay.hidden = m !== "watch";
    obMode.querySelector(".lbl").textContent = m === "watch" ? "Scroll" : "Watch";
    obMode.setAttribute("aria-label", m === "watch" ? "Scroll instead, at your own pace" : "Watch: the film plays itself");
    if (m === "watch" && startIn) { setPlaying(false, true); startTimer = setTimeout(function () { startTimer = 0; if (how === "watch") setPlaying(true); }, startIn); }
    else setPlaying(m === "watch");
  }
  function setPlaying(on, keepSong) {
    playing = on; playY = window.scrollY; wt = tFromS(sFromY(window.scrollY)); playLast = performance.now();
    if (on && wt >= TT - 0.05) { jumpTo(0); target = prog = 0; Score.restart(); playY = window.scrollY; wt = 0; } // at the end, Watch starts the film again
    if (on && how === "watch") Score.seek(wt); // the song stands where the film stands
    obPlay.setAttribute("aria-pressed", on ? "true" : "false"); obPlay.querySelector(".lbl").textContent = on ? "Pause" : "Play";
    if (!keepSong) Score.suspend(songHeld()); // the song is tied to Play and Pause; in scroll mode it simply plays
    if (on) requestAnimationFrame(playStep);
  }
  function playStep(now) {
    if (!playing) return;
    var dt = Math.min(0.25, (now - playLast) / 1000); playLast = now; // keeps its pace on a slow phone, without leaping after a stall
    // A chapter jump, Skip, Home or the scrollbar moved the film: Watch carries on from wherever it landed.
    if (Math.abs(window.scrollY - playY) > 40 || (window.AriyaScroll && AriyaScroll.busy)) { playY = window.scrollY; wt = tFromS(sFromY(playY)); Score.seek(wt); requestAnimationFrame(playStep); return; }
    // The song is the clock: the picture follows it, and waits while it gathers data, so the song is never pulled
    // about (each pull made it skip). Without the song (silent, or the generated score) the film keeps its own time.
    var ck = Score.clock();
    if (ck !== null) {
      if (wt > TT - 1.5 && ck < 1.5) wt = TT; // the song has come round to its start: the film is over
      else wt = Math.min(TT, Math.abs(ck - wt) < 1.5 ? Math.max(wt, ck) : ck);
    } else if (!Score.waiting()) wt = Math.min(TT, wt + dt);
    window.scrollTo({ top: yFromS(sFromT(wt)), behavior: "instant" }); playY = window.scrollY;
    if (wt >= TT) { setHow("scroll"); return; } // the film is over; the song plays on, low, under the page
    requestAnimationFrame(playStep);
  }
  function jumpTo(y) { if (window.AriyaScroll && AriyaScroll.enabled) AriyaScroll.jump(y); else window.scrollTo({ top: y, behavior: "instant" }); }
  function replayFilm() { jumpTo(0); target = prog = 0; Score.restart(); setPlaying(how === "watch"); }
  obPlay.addEventListener("click", function () { if (startTimer) { clearTimeout(startTimer); startTimer = 0; setPlaying(false); return; } setPlaying(!playing); });
  document.getElementById("obReplay").addEventListener("click", replayFilm);
  // Skip: past the opening while it plays; after that, to the end of the film and the planning pages.
  obSkip.addEventListener("click", function () { scrollToRaw(skipToEnd ? 1 : rawFromS(sFromScene("C", 0.01))); });
  obMode.addEventListener("click", function () { setHow(how === "watch" ? "scroll" : "watch"); });
  obCC.addEventListener("click", function () { var on = obCC.getAttribute("aria-pressed") !== "true"; obCC.setAttribute("aria-pressed", on ? "true" : "false"); document.documentElement.classList.toggle("cc-off", !on); });
  // With reduced motion the scroll engine is off, so hold native scrolling here while Watch is on.
  ["wheel", "touchmove", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (!watchLock() || (window.AriyaScroll && AriyaScroll.enabled)) return;
      if (ev === "keydown" && !/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(e.key)) return;
      if (e.target && e.target.closest && e.target.closest(".sheet, .cm, input, textarea, select")) return;
      e.preventDefault(); lockHint();
    }, { passive: false });
  });
  var skipShown = true, skipToEnd = false, slowSince = 0, slowFor = 0, skimTipped = false;
  try { skimTipped = !!sessionStorage.getItem("ariya-skim-tip"); } catch (e) { /* show it this visit */ }
  function updateObar(sc, sv) {
    var barOn = OP.entered && !OP.covered;
    if (barOn !== obar.classList.contains("on")) { obar.classList.toggle("on", barOn); document.documentElement.classList.toggle("obar-on", barOn); }
    var toEnd = sv > sFromScene("N", 1) - 0.004, skip = sv < 0.97;
    if (toEnd !== skipToEnd) { skipToEnd = toEnd; obSkip.innerHTML = toEnd ? 'Skip<span class="long"> to the end</span>' : 'Skip<span class="long"> the opening</span>'; }
    if (skip !== skipShown) { skipShown = skip; obSkip.hidden = !skip; }
    // Someone scrolling steadily at the gentlest pace for a while is told, once, that they can go faster.
    var now = performance.now(), slow = how === "scroll" && window.AriyaScroll && AriyaScroll.busy && AriyaScroll.boost < 1.3;
    if (slow && slowSince) slowFor += Math.min(0.1, (now - slowSince) / 1000);
    slowSince = slow ? now : 0;
    if (!skimTipped && slowFor > 8) {
      skimTipped = true;
      try { sessionStorage.setItem("ariya-skim-tip", "1"); } catch (e) { /* once is enough this visit */ }
      ohint.textContent = (window.matchMedia("(pointer: coarse)").matches ? "Swipe faster to skim" : "Scroll faster to skim") + ", or tap Skip to jump to the end.";
      ohint.classList.add("on"); clearTimeout(hintTimer); hintTimer = setTimeout(function () { ohint.classList.remove("on"); }, 4200);
    }
  }
  function updateDom(r, p, sv, sc) {
    updateOpening(sc); updateObar(sc, sv);
    bar.style.transform = "scaleX(" + r.toFixed(4) + ")";
    oldLayer.style.opacity = sc.mode === "old" ? sc.vis.toFixed(3) : "0";
    oldLayer.style.visibility = sc.mode === "old" ? "visible" : "hidden";
    var shade = 0, oldShade = 0;
    beats.forEach(function (bt) {
      var q = bt.raw ? r : bt.scene ? sc.local : p, w = bt.raw ? 0.006 : bt.scene ? 0.06 : 0.025;
      var o = (bt.a <= 0 ? 1 : seg(q, bt.a, bt.a + w)) * (bt.b >= 1 ? 1 : 1 - seg(q, bt.b - w, bt.b));
      if (!bt.raw && r < PRO) o = 0;
      if (bt.scene && bt.scene !== sc.mode) o = 0;
      if (bt.scene) shade = Math.max(shade, o); else if (bt.el.classList.contains("low")) oldShade = Math.max(oldShade, o);
      bt.el.style.opacity = o.toFixed(3);
      bt.el.style.transform = bt.base + "translateY(" + ((1 - o) * 18).toFixed(1) + "px) scale(" + (1 + (1 - o) * 0.04).toFixed(4) + ")";
      bt.el.style.visibility = o < 0.01 ? "hidden" : "visible";
      setBlur(bt.el, reduceMotion ? 0 : (1 - o) * 12);
    });
    newLayer.style.setProperty("--scrim", shade.toFixed(3));
    oldLayer.style.setProperty("--scrim", (oldShade * 0.85).toFixed(3));
    updatePanel(sc);
    var shatter = seg(p, 0.46, 0.53), W = window.innerWidth;
    var focusZ = 0.15 + 0.7 * seg(p, 0.31, 0.45);
    bubbles.forEach(function (bb) {
      var inn = seg(p, bb.at, bb.at + 0.012), o = inn * (1 - shatter), d = shatter * W * (0.6 + bb.z * 0.6), depthScale = 0.78 + bb.z * 0.42;
      bb.el.style.opacity = (o * (0.55 + 0.45 * bb.z)).toFixed(3);
      bb.el.style.transform = "translate(" + (bb.dx * d).toFixed(1) + "px," + (bb.dy * d + (1 - inn) * 24).toFixed(1) + "px) rotate(" + (bb.tilt + bb.rot * shatter).toFixed(1) + "deg) scale(" + (depthScale * (0.9 + inn * 0.1 - shatter * 0.3)).toFixed(3) + ")";
      bb.el.style.visibility = o < 0.01 ? "hidden" : "visible";
      if (o >= 0.01) setBlur(bb.el, reduceMotion ? 0 : Math.abs(bb.z - focusZ) * 9 + shatter * 6);
    });
    groupbar.style.opacity = bump(p, 0.29, 0.31, 0.46, 0.5).toFixed(3);
    unread.textContent = String(Math.round(seg(p, 0.3, 0.46) * 312));
    // The diamond macro stays on screen; light only floods at the cut to the hall (0.675), then clears for the envelope.
    var fl = bump(p, 0.64, 0.668, 0.676, 0.7);
    flash.style.opacity = (fl * 0.92).toFixed(3);
    flash.style.setProperty("--iris", (0.3 + 0.75 * seg(p, 0.64, 0.69)).toFixed(3));
    flash.style.setProperty("--spin", ((p - 0.6) * 2400).toFixed(1) + "deg");
    flash.style.setProperty("--glint", (bump(p, 0.645, 0.66, 0.672, 0.69) * 0.9).toFixed(3));

    // Envelope: rises in, opens on tap (or on its own if the reader keeps scrolling), leaves with the chapter.
    var eo = bump(p, 0.675, 0.7, 0.765, 0.785);
    tiltX += (tiltTX - tiltX) * 0.08; tiltY += (tiltTY - tiltY) * 0.08;
    var fit = Math.min(1, (window.innerHeight - 110) / 640);
    envwrap.style.opacity = eo.toFixed(3);
    envwrap.style.transform = "translate(-50%, -50%) translateY(" + ((1 - eo) * 60).toFixed(1) + "px) scale(" + (fit * (0.92 + eo * 0.08)).toFixed(3) + ") rotateX(" + (-tiltY * 4 + (1 - eo) * 18).toFixed(2) + "deg) rotateY(" + (tiltX * 5).toFixed(2) + "deg)";
    envwrap.style.visibility = eo < 0.01 ? "hidden" : "visible";
    envwrap.style.pointerEvents = eo > 0.6 ? "auto" : "none";
    if (p > 0.735 && p < 0.8) openEnv();
    if (p < 0.67 || p > 0.8) closeEnv();

    var fill = seg(p, 0.79, 0.87);
    cConfirmed.textContent = String(Math.round(fill * 241));
    var seated = Math.round(fill * 218);
    cSeated.textContent = String(seated);
    scrim.style.opacity = bump(p, 0.775, 0.8, 0.88, 0.9).toFixed(3);
    var go = bump(p, 0.785, 0.81, 0.875, 0.895);
    guestsEl.style.opacity = go.toFixed(3);
    guestsEl.style.transform = "translateY(-50%) translateX(" + ((1 - go) * 30).toFixed(1) + "px)";
    guestRows.forEach(function (li, i) { li.classList.toggle("in", fill > (i + 0.5) / guestData.length * 0.95); });

    var bt = biz.getBoundingClientRect().top;
    OP.covered = !EMBED && bt <= 0;
    nav.classList.toggle("solid", bt < window.innerHeight * 0.5);
    railEl.classList.toggle("off", bt < window.innerHeight * 0.6);
    footUi.style.opacity = bt < window.innerHeight * 0.8 ? "0" : "1";
    scrollcue.style.opacity = r < 0.02 ? "1" : "0";

    var active = 0;
    chapters.forEach(function (c, i) { if (i === 0 || sv >= c[1] - 0.003 && r >= PRO) active = i; });
    if (!OP.entered) active = 0; // behind the door the film is only a backdrop
    if (bt < window.innerHeight * 0.5) active = -1;
    if (active !== lastChapter) {
      lastChapter = active;
      whereNo.textContent = active < 0 ? "" : (active < 10 ? "00" : "0") + active;
      whereNo.previousElementSibling.hidden = active < 0;
      whereName.textContent = active < 0 ? "Àríyá" : chapters[active][0];
      railBtns.forEach(function (b, i) { if (i === active) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    }
    return seated;
  }

  var t0 = performance.now();
  function tick() {
    if (EMBED) {
      // hero: drift in from the wide establishing shot, settle on the box, open it, raise the ring, then hold.
      // hall: follow the progress the host page sends as the visitor scrolls the hall section.
      if (EMBED === "hero") {
        if (OP.loaded >= 1 && !embedT0) embedT0 = performance.now();
        var k = reduceMotion ? 1 : embedT0 ? smooth((performance.now() - embedT0) / 9000) : 0;
        target = PRO * 0.39 + (rawFromS(sFromOld(0.215)) - PRO * 0.39) * k;
      } else target = rawFromS(sFromOld(embedP));
      if (OP.paused) { requestAnimationFrame(tick); return; }
    }
    // Behind the door, before anyone enters: hold on the ring above its box, with the camera drifting round it.
    if (!EMBED && !OP.entered && OP.loaded >= 1 && !OP.failed) {
      target = prog = rawFromS(sFromOld(0.27)); OP.gateLoop = true;
      if (!gate.classList.contains("live")) gate.classList.add("live");
    } else OP.gateLoop = false;
    prog += (target - prog) * 0.085;
    if (Math.abs(target - prog) < 0.00005) prog = target;
    var r = prog, sv = clamp((r - PRO) / (1 - PRO), 0, 1), sc = mapStory(sv), p = sc.p;
    if (r < PRO) { sc.fade = 0; sc.vis = 1; }
    OP.raw = r; OP.pro = clamp(r / PRO, 0, 1); OP.p = p; OP.s = sv; OP.scene = sc;
    OP.seated = updateDom(r, p, sv, sc);
    if (OP.entered) Score.scene(p, OP.pro);
    if (OP.render) {
      OP.render(p, (performance.now() - t0) / 1000);
      if (EMBED && !readySent && OP.loaded >= 1 && ++frames > 4) { readySent = true; parent.postMessage({ type: "ariya-stage-ready", mode: EMBED }, location.origin); }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
