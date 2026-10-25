/* Scroll pacing for the cinematic pages.
   However hard the visitor flicks (wheel, trackpad, touch, keys or an in-page link), the page travels at a
   capped speed, slower still inside the scroll-driven scenes, so every frame plays in order and nothing is
   skipped. The scrollbar and find-in-page still work; the pacer simply follows them.
   Turned off for prefers-reduced-motion, where normal scrolling is kept.

   Use: AriyaScroll.init({ slow: [element, ...] })  // sections that should play more slowly
        AriyaScroll.to(y)                             // paced programmatic scroll */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cur = 0, tgt = 0, running = false, last = 0, slowEls = [], enabled = false, ignoreUntil = 0;
  var FAST = 34, SLOW = 20; // px per 60 fps frame
  function maxY() { return Math.max(0, document.documentElement.scrollHeight - innerHeight); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function inSlow() {
    var c = innerHeight / 2;
    for (var i = 0; i < slowEls.length; i++) { var r = slowEls[i].getBoundingClientRect(); if (r.top < c && r.bottom > c) return true; }
    return false;
  }
  function blocked() { return document.documentElement.classList.contains("locked") || !!document.querySelector(".sheet:not([hidden])"); }
  function push(d) {
    if (blocked()) return;
    if (!running) cur = tgt = scrollY;
    // Never let a burst of input run more than a screen ahead of what has been shown.
    tgt = clamp(tgt + d, Math.max(0, cur - innerHeight), Math.min(maxY(), cur + innerHeight));
    start();
  }
  function start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } }
  function step(now) {
    var dt = Math.min(48, now - last) / 16.67; last = now;
    var diff = tgt - cur;
    if (Math.abs(diff) < 0.5) { cur = tgt; window.scrollTo({ top: cur, behavior: "instant" }); running = false; return; }
    var cap = (inSlow() ? SLOW : FAST) * dt, mv = diff * 0.14 * dt;
    if (Math.abs(mv) > cap) mv = mv > 0 ? cap : -cap;
    if (Math.abs(mv) < 0.6) mv = diff > 0 ? Math.min(0.6, diff) : Math.max(-0.6, diff);
    cur += mv; ignoreUntil = now + 80;
    window.scrollTo({ top: cur, behavior: "instant" });
    requestAnimationFrame(step);
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
      slowEls = (o && o.slow) || [];
      cur = tgt = scrollY;
      window.addEventListener("wheel", function (e) {
        if (e.ctrlKey || blocked() || scrollsSideways(e.target, e.deltaX, e.deltaY)) return;
        e.preventDefault();
        var d = e.deltaY * (e.deltaMode === 1 ? 36 : e.deltaMode === 2 ? innerHeight : 1);
        push(clamp(d, -140, 140));
      }, { passive: false });
      window.addEventListener("keydown", function (e) {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || editable(document.activeElement)) return;
        var k = e.key, d = null;
        if (k === "ArrowDown") d = 90; else if (k === "ArrowUp") d = -90;
        else if (k === "PageDown" || (k === " " && !e.shiftKey)) d = innerHeight * 0.85;
        else if (k === "PageUp" || (k === " " && e.shiftKey)) d = -innerHeight * 0.85;
        else if (k === "Home") { e.preventDefault(); AriyaScroll.to(0); return; }
        else if (k === "End") { e.preventDefault(); AriyaScroll.to(maxY()); return; }
        if (d !== null) { e.preventDefault(); push(d); }
      });
      // Touch: the finger moves the page directly (capped), and a flick carries on with paced momentum.
      var ty = 0, tx = 0, startScroll = 0, lastY = 0, lastT = 0, vel = 0, mode = null;
      window.addEventListener("touchstart", function (e) {
        if (e.touches.length !== 1 || blocked()) { mode = "skip"; return; }
        ty = lastY = e.touches[0].clientY; tx = e.touches[0].clientX; lastT = performance.now(); vel = 0; mode = null;
        startScroll = running ? cur : scrollY; if (!running) cur = tgt = scrollY;
      }, { passive: true });
      window.addEventListener("touchmove", function (e) {
        if (mode === "skip" || e.touches.length !== 1) return;
        var y = e.touches[0].clientY, x = e.touches[0].clientX;
        if (mode === null) {
          if (Math.abs(y - ty) < 6 && Math.abs(x - tx) < 6) return;
          mode = scrollsSideways(e.target, x - tx, y - ty) ? "skip" : "pace";
          if (mode === "skip") return;
        }
        e.preventDefault();
        var now = performance.now(); vel = 0.8 * vel + 0.2 * ((lastY - y) / Math.max(1, now - lastT)); lastY = y; lastT = now;
        tgt = clamp(startScroll + (ty - y), 0, maxY()); start();
      }, { passive: false });
      window.addEventListener("touchend", function () {
        if (mode !== "pace") return;
        push(clamp(vel * 260, -innerHeight * 0.9, innerHeight * 0.9));
        mode = null;
      }, { passive: true });
      // In-page links travel through the pacer too.
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || e.defaultPrevented) return;
        var id = a.getAttribute("href").slice(1), el = id && document.getElementById(id);
        if (!el) return;
        e.preventDefault(); history.replaceState(null, "", "#" + id);
        AriyaScroll.to(el.getBoundingClientRect().top + scrollY - 70);
      });
      // Scrollbar drags, find-in-page and focus moves: follow them instead of fighting them.
      window.addEventListener("scroll", function () { if (!running && performance.now() > ignoreUntil) cur = tgt = scrollY; }, { passive: true });
    },
    to: function (y) {
      if (!enabled) { window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" }); return; }
      if (!running) cur = scrollY;
      tgt = clamp(y, 0, maxY()); start();
    },
    get enabled() { return enabled; }
  };
})();
