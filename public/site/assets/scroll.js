/* Scroll at one speed.
   However the visitor scrolls (a flick, a slow trackpad drag, a mouse wheel, a swipe, the keys), the page travels at
   the same predefined speed, easing in and out, so every scene plays at the pace it was designed for. Scrolling only
   says which way to go and for how long. The scrollbar and find-in-page still work; the engine follows them.
   Turned off for prefers-reduced-motion, where normal scrolling is kept.

   Use: AriyaScroll.init({ speed: 0.8 })   // screens per second
        AriyaScroll.init({ speedAt: fn })  // or a pace that varies along the page: fn(y) gives pixels per second
        AriyaScroll.init({ lock: fn, onLocked: fn }) // while lock() is true, scrolling input is held (the film is playing itself)
        AriyaScroll.to(y)                  // glide to a position (chapter links, Home/End) */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var enabled = false, running = false, last = 0, ignoreUntil = 0;
  var cur = 0, vel = 0, dir = 0, holdUntil = 0, speed = 0.8;
  var glide = null, speedAt = null, lock = null, onLocked = null; // { from, to, t0, dur } for programmatic moves
  var HOLD_WHEEL = 180, HOLD_KEY = 260, HOLD_PAGE = 900, HOLD_TOUCH = 140, TAIL_TOUCH = 420;
  var TAU_UP = 0.14, TAU_DOWN = 0.26; // seconds: how quickly it reaches speed, and how softly it stops
  function maxY() { return Math.max(0, document.documentElement.scrollHeight - innerHeight); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function blocked() { return document.documentElement.classList.contains("locked") || !!document.querySelector(".sheet:not([hidden]), .cm:not([hidden])"); }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } }
  // Scrolling input: a direction, held for a moment. Repeated input simply keeps it going.
  function hold(d, ms) {
    if (blocked() || !d) return;
    if (!running) { cur = scrollY; vel = 0; }
    glide = null;
    if (d !== dir) { dir = d; }
    holdUntil = Math.max(holdUntil, performance.now() + ms);
    start();
  }
  function step(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (glide) {
      var k = clamp((now - glide.t0) / glide.dur, 0, 1);
      cur = glide.from + (glide.to - glide.from) * easeInOut(k);
      if (k >= 1) { glide = null; vel = 0; }
    } else {
      var target = now < holdUntil ? dir * (speedAt ? speedAt(cur) : speed * innerHeight) : 0;
      var tau = Math.abs(target) > Math.abs(vel) ? TAU_UP : TAU_DOWN;
      vel += (target - vel) * (1 - Math.exp(-dt / tau));
      cur += vel * dt;
      if (cur <= 0 || cur >= maxY()) { cur = clamp(cur, 0, maxY()); vel = 0; if (now >= holdUntil) dir = 0; }
    }
    ignoreUntil = now + 100;
    window.scrollTo({ top: cur, behavior: "instant" });
    if (glide || now < holdUntil || Math.abs(vel) > 2) requestAnimationFrame(step);
    else { running = false; vel = 0; dir = 0; }
  }
  function editable(el) { return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName)); }
  function scrollsSideways(el, dx, dy) {
    for (; el && el !== document.body; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX) && Math.abs(dx) > Math.abs(dy)) return true;
    }
    return false;
  }

  window.AriyaScroll = {
    init: function (o) {
      if (reduce || enabled) return; enabled = true;
      speed = (o && o.speed) || 0.8; speedAt = (o && o.speedAt) || null; lock = (o && o.lock) || null; onLocked = (o && o.onLocked) || null;
      cur = scrollY;
      var held = function (e) { if (!lock || !lock()) return false; if (e && e.cancelable) e.preventDefault(); if (onLocked) onLocked(); return true; };
      window.addEventListener("wheel", function (e) {
        if (e.ctrlKey || blocked() || held(e) || scrollsSideways(e.target, e.deltaX, e.deltaY)) return;
        e.preventDefault();
        if (Math.abs(e.deltaY) < 0.5) return;
        hold(e.deltaY > 0 ? 1 : -1, HOLD_WHEEL);
      }, { passive: false });
      window.addEventListener("keydown", function (e) {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || editable(document.activeElement)) return;
        var k = e.key;
        if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(k) && !blocked() && held(e)) return;
        if (k === "ArrowDown") { e.preventDefault(); hold(1, HOLD_KEY); }
        else if (k === "ArrowUp") { e.preventDefault(); hold(-1, HOLD_KEY); }
        else if (k === "PageDown" || (k === " " && !e.shiftKey)) { e.preventDefault(); hold(1, HOLD_PAGE); }
        else if (k === "PageUp" || (k === " " && e.shiftKey)) { e.preventDefault(); hold(-1, HOLD_PAGE); }
        else if (k === "Home") { e.preventDefault(); AriyaScroll.to(0); }
        else if (k === "End") { e.preventDefault(); AriyaScroll.to(maxY()); }
      });
      // Touch: the finger sets the direction; the page moves at the same speed, and carries on briefly after release.
      var lastY = 0, lastX = 0, mode = null;
      window.addEventListener("touchstart", function (e) {
        if (e.touches.length !== 1 || blocked()) { mode = "skip"; return; }
        lastY = e.touches[0].clientY; lastX = e.touches[0].clientX; mode = null;
      }, { passive: true });
      window.addEventListener("touchmove", function (e) {
        if (mode === "skip" || e.touches.length !== 1) return;
        if (held(e)) return;
        var y = e.touches[0].clientY, x = e.touches[0].clientX, dy = lastY - y, dx = lastX - x;
        if (mode === null) {
          if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
          mode = scrollsSideways(e.target, dx, dy) ? "skip" : "pace";
          if (mode === "skip") return;
        }
        e.preventDefault();
        if (Math.abs(dy) >= 2) { hold(dy > 0 ? 1 : -1, HOLD_TOUCH); lastY = y; lastX = x; }
      }, { passive: false });
      window.addEventListener("touchend", function () { if (mode === "pace" && dir) hold(dir, TAIL_TOUCH); mode = null; }, { passive: true });
      // In-page links glide there.
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || e.defaultPrevented) return;
        var id = a.getAttribute("href").slice(1), el = id && document.getElementById(id);
        if (!el) return;
        e.preventDefault(); history.replaceState(null, "", "#" + id);
        AriyaScroll.to(el.getBoundingClientRect().top + scrollY - 70);
      });
      // Scrollbar drags, find-in-page and focus moves: follow them instead of fighting them.
      window.addEventListener("scroll", function () { if (!running && performance.now() > ignoreUntil) cur = scrollY; }, { passive: true });
    },
    // A programmatic move (a chapter in the menu, Home, End): a quick, eased glide, not the reading speed.
    to: function (y) {
      y = clamp(y, 0, maxY());
      if (!enabled) { window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" }); return; }
      if (!running) cur = scrollY;
      var dist = Math.abs(y - cur);
      glide = { from: cur, to: y, t0: performance.now(), dur: clamp(dist / (4 * innerHeight), 0.6, 3.2) * 1000 };
      holdUntil = 0; dir = 0; vel = 0; start();
    },
    // Straight there, no glide (Replay).
    jump: function (y) {
      y = clamp(y, 0, maxY()); glide = null; holdUntil = 0; dir = 0; vel = 0; cur = y; ignoreUntil = performance.now() + 100;
      window.scrollTo({ top: y, behavior: "instant" });
    },
    get enabled() { return enabled; },
    get busy() { return running; }
  };
})();
