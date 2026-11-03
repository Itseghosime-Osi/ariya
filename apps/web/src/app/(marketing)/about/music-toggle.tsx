"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isOn, onMusicChange, start, stop } from "@/lib/site/score";

// The music button lives in the header, beside the menu button, so the nav
// styles treat it exactly as the original page did.
export function MusicToggle() {
  const [target, setTarget] = useState<Element | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setTarget(document.querySelector("header.site-head .wrap"));
    setPlaying(isOn());
    return onMusicChange(setPlaying);
  }, []);

  if (!target) return null;

  return createPortal(
    <button
      className="music head-music"
      type="button"
      aria-label="Music (Yori Yori by Abefe)"
      aria-pressed={playing}
      onClick={() => {
        if (playing) stop();
        else start();
      }}
    >
      <span className="eq" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="lbl">Music</span>
      <span className="sr-only"> (Yori Yori by Abefe)</span>
    </button>,
    target
  );
}
