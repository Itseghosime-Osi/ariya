"use client";

import { useEffect, useRef, useState } from "react";
import * as score from "@/lib/site/score";
import { FilmEngine, type FilmStatus } from "./engine";
import { songLevel } from "./story";
import {
  FilmChrome,
  FilmClose,
  FilmNav,
  FilmStage,
  Gate,
  NewLayer,
  OldLayer,
  Opening,
} from "./film-parts";

/** The archive's 3D module; it plugs into window.OP.render and reports OP.loaded. */
const INITIAL: FilmStatus = {
  entered: false,
  choosing: false,
  how: "scroll",
  playing: false,
  captions: true,
  soundOn: false,
  chapter: 0,
  envelopeOpen: false,
};

function velvetHint() {
  try {
    return localStorage.getItem("ariya-colour") ?? "burgundy";
  } catch {
    return "burgundy";
  }
}

export function Film() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<FilmStatus>(INITIAL);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const engine = new FilmEngine({
      root,
      velvet: velvetHint(),
      reduceMotion,
      onStatus: setStatus,
      onChime: score.chime,
      onClock: score.clock,
      onWaiting: score.waiting,
      onSeek: score.seek,
      onSuspend: score.suspend,
      onLoop: score.loop,
      onRestart: score.restart,
      onFinale: score.finale,
      onSfx: score.sfx,
      onAmbience: score.ambience,
      onRate: score.setRate,
      onRocket: score.rocket,
      // A soft bed under the picture; it swells for the dancing, not before.
      onScene: (p, pro, mode) => score.level(songLevel(mode, p, pro)),
    });

    engine.onSoundChange = (on) => {
      if (on) score.start();
      else score.stop();
    };

    root.classList.add("locked");
    engine.collectBeats();
    engine.mount();
    score.groove(true);

    return () => {
      engine.destroy();
      score.groove(false);
      score.stop();
    };
  }, []);

  return (
    <div ref={rootRef} className="film">
      <FilmStage />
      <Gate status={status} />
      <FilmNav />
      <div className="overlay" id="overlay">
        <Opening status={status} />
        <OldLayer />
        <NewLayer />
      </div>
      <FilmChrome />
      <FilmClose />
    </div>
  );
}
