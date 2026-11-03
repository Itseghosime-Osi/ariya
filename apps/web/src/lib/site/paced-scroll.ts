// Scroll at the designed pace, or faster when the visitor means it. Ported from
// public/site/assets/scroll.js.
//
// A gentle scroll (a slow trackpad drag, a wheel notch, a soft swipe, the arrow
// keys) travels at the predefined speed, easing in and out, so every scene plays
// at the pace it was designed for. Scrolling harder skims: the pace rises
// smoothly up to MAX_BOOST times and settles back when the input calms or turns
// round. The scrollbar and find-in-page still work; the engine follows them.
// Turned off for prefers-reduced-motion, where normal scrolling is kept.

const HOLD_WHEEL = 180;
const HOLD_KEY = 260;
const HOLD_PAGE = 900;
const HOLD_TOUCH = 140;
const TAIL_TOUCH = 420;
const TAU_UP = 0.14; // seconds: how quickly it reaches speed
const TAU_DOWN = 0.26; // and how softly it stops
const MAX_BOOST = 4;
const RATE_WINDOW = 600;
const TAU_BOOST = 0.9;

let enabled = false;
let running = false;
let last = 0;
let ignoreUntil = 0;
let cur = 0;
let vel = 0;
let dir = 0;
let holdUntil = 0;
let speed = 0.8;
let boost = 1;
let inputs: { t: number; px: number }[] = [];
let glide: { from: number; to: number; t0: number; dur: number } | null = null;
let reduce = false;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function maxY() {
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
}

function blocked() {
  return (
    document.documentElement.classList.contains("locked") ||
    !!document.querySelector(".sheet:not([hidden]), .cm:not([hidden])")
  );
}

function easeInOut(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function feel(px: number) {
  const now = performance.now();
  inputs.push({ t: now, px });
  while (inputs.length && now - inputs[0].t > RATE_WINDOW) inputs.shift();
  let sum = 0;
  for (const i of inputs) sum += i.px;
  const rate = sum / (RATE_WINDOW / 1000) / window.innerHeight; // screens/second
  // a soft drag stays near 1, steady swiping about 2 to 3, fast flicks the most
  boost = Math.max(boost, clamp(1 + (rate - 0.4) * 1.8, 1, MAX_BOOST));
}

function start() {
  if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(step);
  }
}

function hold(d: number, ms: number, px?: number) {
  if (blocked() || !d) return;
  if (!running) {
    cur = window.scrollY;
    vel = 0;
  }
  glide = null;
  // turning back to look again is always gentle
  if (d !== dir) {
    dir = d;
    boost = 1;
    inputs = [];
  }
  if (px) feel(px);
  holdUntil = Math.max(holdUntil, performance.now() + ms);
  start();
}

function step(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (glide) {
    const k = clamp((now - glide.t0) / glide.dur, 0, 1);
    cur = glide.from + (glide.to - glide.from) * easeInOut(k);
    if (k >= 1) {
      glide = null;
      vel = 0;
    }
  } else {
    boost = 1 + (boost - 1) * Math.exp(-dt / TAU_BOOST);
    const target =
      now < holdUntil ? dir * speed * window.innerHeight * boost : 0;
    const tau = Math.abs(target) > Math.abs(vel) ? TAU_UP : TAU_DOWN;
    vel += (target - vel) * (1 - Math.exp(-dt / tau));
    cur += vel * dt;
    if (cur <= 0 || cur >= maxY()) {
      cur = clamp(cur, 0, maxY());
      vel = 0;
      if (now >= holdUntil) dir = 0;
    }
  }
  ignoreUntil = now + 100;
  window.scrollTo({ top: cur, behavior: "instant" as ScrollBehavior });
  if (glide || now < holdUntil || Math.abs(vel) > 2)
    requestAnimationFrame(step);
  else {
    running = false;
    vel = 0;
    dir = 0;
  }
}

function editable(el: Element | null) {
  return (
    !!el &&
    ((el as HTMLElement).isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))
  );
}

function scrollsSideways(el: Element | null, dx: number, dy: number) {
  for (
    let node = el as HTMLElement | null;
    node && node !== document.body;
    node = node.parentElement
  ) {
    if (
      node.scrollWidth > node.clientWidth + 2 &&
      /auto|scroll/.test(getComputedStyle(node).overflowX) &&
      Math.abs(dx) > Math.abs(dy)
    ) {
      return true;
    }
  }
  return false;
}

export function toPaced(y: number) {
  y = clamp(y, 0, maxY());
  if (!enabled) {
    window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    return;
  }
  if (!running) cur = window.scrollY;
  const dist = Math.abs(y - cur);
  glide = {
    from: cur,
    to: y,
    t0: performance.now(),
    dur: clamp(dist / (4 * window.innerHeight), 0.6, 3.2) * 1000,
  };
  holdUntil = 0;
  dir = 0;
  vel = 0;
  boost = 1;
  start();
}

export function initPacedScroll(opts: { speed?: number } = {}) {
  reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || enabled) return () => {};
  enabled = true;
  speed = opts.speed || 0.8;
  cur = window.scrollY;

  const onWheel = (e: WheelEvent) => {
    if (
      e.ctrlKey ||
      blocked() ||
      scrollsSideways(e.target as Element, e.deltaX, e.deltaY)
    ) {
      return;
    }
    e.preventDefault();
    if (Math.abs(e.deltaY) < 0.5) return;
    hold(
      e.deltaY > 0 ? 1 : -1,
      HOLD_WHEEL,
      Math.abs(e.deltaY) *
        (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1)
    );
  };

  const onKey = (e: KeyboardEvent) => {
    if (
      e.defaultPrevented ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      editable(document.activeElement)
    ) {
      return;
    }
    const k = e.key;
    if (k === "ArrowDown") {
      e.preventDefault();
      hold(1, HOLD_KEY);
    } else if (k === "ArrowUp") {
      e.preventDefault();
      hold(-1, HOLD_KEY);
    } else if (k === "PageDown" || (k === " " && !e.shiftKey)) {
      e.preventDefault();
      hold(1, HOLD_PAGE, window.innerHeight * 0.4);
    } else if (k === "PageUp" || (k === " " && e.shiftKey)) {
      e.preventDefault();
      hold(-1, HOLD_PAGE, window.innerHeight * 0.4);
    } else if (k === "Home") {
      e.preventDefault();
      toPaced(0);
    } else if (k === "End") {
      e.preventDefault();
      toPaced(maxY());
    }
  };

  // Touch: the finger sets the direction; the page moves at the same speed, and
  // carries on briefly after release.
  let lastY = 0;
  let lastX = 0;
  let mode: string | null = null;
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || blocked()) {
      mode = "skip";
      return;
    }
    lastY = e.touches[0].clientY;
    lastX = e.touches[0].clientX;
    mode = null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (mode === "skip" || e.touches.length !== 1) return;
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const dy = lastY - y;
    const dx = lastX - x;
    if (mode === null) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      mode = scrollsSideways(e.target as Element, dx, dy) ? "skip" : "pace";
      if (mode === "skip") return;
    }
    e.preventDefault();
    if (Math.abs(dy) >= 2) {
      hold(dy > 0 ? 1 : -1, HOLD_TOUCH, Math.abs(dy));
      lastY = y;
      lastX = x;
    }
  };
  const onTouchEnd = () => {
    if (mode === "pace" && dir) hold(dir, TAIL_TOUCH * Math.min(2.5, boost));
    mode = null;
  };

  // In-page links glide there.
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute("href")!.slice(1);
    const el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    history.replaceState(null, "", `#${id}`);
    toPaced(el.getBoundingClientRect().top + window.scrollY - 70);
  };

  // Scrollbar drags, find-in-page and focus moves: follow them instead of
  // fighting them.
  const onScroll = () => {
    if (!running && performance.now() > ignoreUntil) cur = window.scrollY;
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  document.addEventListener("click", onClick);
  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    enabled = false;
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    document.removeEventListener("click", onClick);
    window.removeEventListener("scroll", onScroll);
  };
}
