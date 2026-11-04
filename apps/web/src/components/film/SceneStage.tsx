"use client";

import { useEffect, useRef, useState } from "react";

export type VelvetName = "burgundy" | "ruby" | "coral";
export type StageMode = "hero" | "hall";

const TITLES: Record<StageMode, string> = {
  hero: "Live 3D scene: the ring box",
  hall: "Live 3D scene: the reception hall",
};

function canRender3d(): boolean {
  try {
    if (!document.createElement("canvas").getContext("webgl2")) return false;
  } catch {
    return false;
  }
  const saveData = (
    navigator as unknown as { connection?: { saveData?: boolean } }
  ).connection?.saveData;
  return !saveData;
}

function velvetHint(): VelvetName {
  const v = document.documentElement.getAttribute("data-cotd");
  return v === "ruby" || v === "coral" ? v : "burgundy";
}

/**
 * The archive's film engine in embed mode, mounted once the band is near the
 * viewport. Speaks the archive's own handshake: the scene reports ready, we
 * echo the velvet and visibility back, and the hall's scroll progress rides
 * along as `p`. The poster stays until `onReady`.
 */
export function SceneStage({
  mode,
  progressRef,
  onReady,
}: {
  mode: StageMode;
  progressRef?: React.RefObject<number>;
  onReady?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !canRender3d()) return;
    const start = () =>
      setSrc(`/site/index.html?embed=${mode}&velvet=${velvetHint()}`);
    if (!("IntersectionObserver" in window)) {
      start();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        start();
      },
      { rootMargin: "120% 0px" }
    );
    io.observe(host);
    return () => io.disconnect();
  }, [mode]);

  useEffect(() => {
    const frame = frameRef.current;
    const host = hostRef.current;
    if (!src || !frame || !host) return;

    let ready = false;
    let visible = true;
    const post = (msg: Record<string, unknown>) =>
      frame.contentWindow?.postMessage(
        { type: "ariya-stage", ...msg },
        location.origin
      );

    const timer = window.setTimeout(() => {
      if (!ready) setFailed(true);
    }, 30000);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (ready) post({ visible });
      },
      { rootMargin: "0px" }
    );
    io.observe(host);

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || !e.data || e.data.mode !== mode)
        return;
      if (e.data.type === "ariya-stage-ready") {
        ready = true;
        window.clearTimeout(timer);
        post({ visible, velvet: velvetHint() });
        onReady?.();
      }
      if (e.data.type === "ariya-stage-failed") {
        window.clearTimeout(timer);
        setFailed(true);
      }
    };
    window.addEventListener("message", onMessage);

    const velvetWatch = new MutationObserver(() =>
      post({ velvet: velvetHint() })
    );
    velvetWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-cotd"],
    });

    let raf = 0;
    let lastP = -1;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const p = progressRef?.current;
        if (typeof p !== "number" || Math.abs(p - lastP) <= 0.0004) return;
        lastP = p;
        post({ p });
      });
    };
    if (mode === "hall" && progressRef) {
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    return () => {
      window.clearTimeout(timer);
      io.disconnect();
      velvetWatch.disconnect();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [src, mode, progressRef, onReady]);

  return (
    <div ref={hostRef} style={{ position: "absolute", inset: 0 }}>
      {src && !failed ? (
        <iframe
          ref={frameRef}
          src={src}
          title={TITLES[mode]}
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
