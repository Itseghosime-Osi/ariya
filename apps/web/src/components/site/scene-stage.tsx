"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  clamp,
  createJsMap,
  PRO,
  seg,
  smooth,
  type StoryMap,
} from "@/components/film/story";
import { sceneHost, velvetHint, type SceneHost } from "@/lib/site/scene-host";

export type StageMode = "hero" | "hall";

/** One band of the page that shows the film's 3D scene. */
interface Band {
  mode: StageMode;
  host: HTMLElement;
  progressRef?: RefObject<number>;
  onReady?: () => void;
  /** Share of the host on screen; only the most visible band renders. */
  ratio: number;
  frames: number;
  live: boolean;
}

const bands = new Set<Band>();
let stage: DirectStage | null = null;

/**
 * The hero opens on the film's ring, not its letter: the beat where the ring has
 * lifted clear of the lid (`from`) and rises the rest of the way (`to`). The turn
 * that follows shows the band edge-on, so the drift stops short of it.
 */
const HERO_FROM = 0.16;
const HERO_TO = 0.185;

function activeBand(): Band | null {
  let best: Band | null = null;
  for (const band of bands) {
    if (band.ratio > 0 && (!best || band.ratio > best.ratio)) best = band;
  }
  return best;
}

function ensureStage(): DirectStage | null {
  if (!stage) {
    const host = sceneHost();
    if (!host) return null;
    stage = new DirectStage(host);
  }
  stage.start();
  return stage;
}

/**
 * Drives the shared scene on /about.
 *
 * The module is a document singleton, so it is not mounted per band: one
 * instance serves both of the page's bands and moves the canvas to whichever is
 * on screen.
 */
class DirectStage {
  private readonly op: Record<string, unknown>;
  private map: StoryMap = createJsMap();
  private reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private raf = 0;
  private running = false;
  private prog = 0;
  private heroStart = 0;
  /** The next frame starts at its target instead of easing from a stale one. */
  private snap = true;

  constructor(private host: SceneHost) {
    this.op = host.op;
  }

  start() {
    if (this.running) return;
    this.running = true;

    const first = activeBand() ?? [...bands][0];
    if (first) this.host.adopt(first.host);

    this.op.embed = "hero";
    // The module only runs its lens intro once it sees that a visitor arrived.
    // Without this it never latches a start time and holds maximum blur.
    this.op.entered = true;
    // A later visit gets the drift-in again, from the wide establishing shot.
    this.heroStart = 0;
    this.snap = true;
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Called when the last band unmounts, so a page without the scene is idle. */
  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = () => {
    this.raf = requestAnimationFrame(this.frame);
    const band = activeBand();
    if (!band) {
      this.op.paused = true;
      return;
    }
    this.op.paused = false;

    this.host.adopt(band.host);

    const op = this.op;
    const loaded = Number(op.loaded) || 0;
    if (band.mode === "hero" && loaded >= 1 && !this.heroStart) {
      this.heroStart = performance.now();
    }

    // hero: drift in on the ring, past the letter the film opens with.
    // hall: follow the progress the host section sends as it is scrolled.
    let target: number;
    if (band.mode === "hero") {
      const k = this.reduceMotion
        ? 1
        : this.heroStart
          ? smooth((performance.now() - this.heroStart) / 9000)
          : 0;
      target = this.map.rawFromS(
        this.map.sFromOld(HERO_FROM + (HERO_TO - HERO_FROM) * k)
      );
    } else {
      const p = clamp(band.progressRef?.current ?? 0.775, 0, 1);
      target = this.map.rawFromS(this.map.sFromOld(p));
    }

    if (this.snap) {
      this.prog = target;
      this.snap = false;
    } else {
      this.prog += (target - this.prog) * 0.085;
      if (Math.abs(target - this.prog) < 0.00005) this.prog = target;
    }

    const raw = this.prog;
    const sv = clamp((raw - PRO) / (1 - PRO), 0, 1);
    const scene = this.map.sceneAt(sv);
    if (raw < PRO) {
      scene.fade = 0;
      scene.vis = 1;
    }
    // The hall's scroll runs up to a chapter boundary, where the film dissolves
    // to black. The band never cuts away, so it holds the picture up instead.
    if (band.mode === "hall") scene.vis = 1;

    op.raw = raw;
    op.pro = clamp(raw / PRO, 0, 1);
    op.p = scene.p;
    op.s = sv;
    op.scene = scene;
    op.velvet = velvetHint();
    // The hall's guests take their seats as its count rises.
    op.seated = Math.round(seg(scene.p, 0.79, 0.87) * 218);

    const render = op.render as ((p: number, t: number) => void) | null;
    render?.(scene.p, this.host.now());

    band.frames += 1;
    if (!band.live && loaded >= 1 && band.frames > 4) {
      band.live = true;
      band.onReady?.();
    }
  };
}

/**
 * The stage for one band. Both bands share the document's single scene module;
 * the canvas moves to the band that is on screen.
 */
export function SceneStage({
  mode,
  progressRef,
  onReady,
}: {
  mode: StageMode;
  progressRef?: RefObject<number>;
  onReady?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    const band: Band = {
      mode,
      host,
      progressRef,
      onReady,
      ratio: rect.bottom > 0 && rect.top < window.innerHeight ? 1 : 0,
      frames: 0,
      live: false,
    };
    bands.add(band);

    if (band.ratio > 0) ensureStage();

    if (!("IntersectionObserver" in window)) {
      band.ratio = 1;
      ensureStage();
      return () => {
        bands.delete(band);
        if (bands.size === 0) stage?.stop();
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          band.ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
          if (band.ratio > 0) ensureStage();
        }
      },
      { threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] }
    );
    io.observe(host);

    return () => {
      io.disconnect();
      bands.delete(band);
      if (bands.size === 0) stage?.stop();
    };
  }, [mode, progressRef, onReady]);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
}
