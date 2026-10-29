"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISSED_KEY = "ariya-install-hint";
const SNOOZE_MS = 21 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 4000;

/** Chrome's install prompt event; not in the DOM typings yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type HintMode = "ios" | "prompt";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  const { userAgent, platform, maxTouchPoints } = navigator;
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    // iPadOS reports itself as a Mac.
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

/** Phones and tablets: touch is the main input. Laptops get the browser's own install button. */
function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function snoozed() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Boolean(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * A small card for phones and tablets that explains how to install Àríyá so it
 * opens full screen like an app. iPhones and iPads can't show an install
 * button, so they get the Share steps; Android and Chrome get a real Install
 * button. Laptops are left alone: their browser already offers install in the
 * address bar.
 */
export function InstallHint() {
  const [mode, setMode] = useState<HintMode | null>(null);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;

    let timer = 0;
    const reveal = (next: HintMode) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMode(next), SHOW_AFTER_MS);
    };

    const onPrompt = (e: Event) => {
      if (!isTouchDevice()) return;
      // Keep Chrome's own mini-bar away; we show our own card instead.
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      reveal("prompt");
    };
    const onInstalled = () => {
      window.clearTimeout(timer);
      deferred.current = null;
      setMode(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIOS()) reveal("ios");

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setMode(null);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* not remembered this time */
    }
  };

  const install = async () => {
    const event = deferred.current;
    if (!event) return;
    deferred.current = null;
    setMode(null);
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "dismissed") dismiss();
  };

  if (!mode) return null;

  return (
    <section
      aria-label="Install the app"
      data-testid="install-hint"
      className="animate-in fade-in slide-in-from-bottom-3 fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md duration-500 md:inset-x-auto md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] md:right-6 md:mx-0 md:w-[24rem]"
    >
      <div className="flex items-start gap-3 rounded-[22px] bg-white/95 p-3 pr-2 shadow-[0_18px_40px_-18px_rgba(28,7,13,0.45),0_2px_6px_-2px_rgba(28,7,13,0.12)] ring-1 ring-black/5">
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#7a1530] to-[#2a0610] font-display text-xl font-bold italic text-gold"
        >
          À
        </span>

        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-sm font-semibold text-night">Get the Àríyá app</p>
          {mode === "ios" ? (
            <p className="mt-0.5 text-xs leading-relaxed text-label-2">
              Open it full screen, like an app. Tap{" "}
              <Share
                aria-label="Share"
                role="img"
                size={13}
                className="inline-block -translate-y-px text-burgundy"
              />{" "}
              in Safari, then <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <>
              <p className="mt-0.5 text-xs leading-relaxed text-label-2">
                Open it full screen, like an app, straight from your home
                screen.
              </p>
              <button
                type="button"
                onClick={install}
                className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-burgundy px-4 text-xs font-semibold text-ivory outline-none transition-colors hover:bg-wine focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2"
              >
                <Download size={15} aria-hidden="true" />
                Install app
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-night/55 outline-none transition-colors hover:bg-night/5 hover:text-night focus-visible:ring-2 focus-visible:ring-burgundy"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
