"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
} from "../actions";

type State =
  "loading" | "unsupported" | "install-first" | "blocked" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

/**
 * Turns app notifications on or off for this device: a guest replying, and other moments that
 * matter, arrive on the phone even when Àríyá is closed.
 */
export function NotificationsCard({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<{
    tone: "good" | "bad";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported) {
        // iPhone and iPad only offer notifications to apps added to the Home Screen.
        if (!cancelled) {
          setState(isIos() && !isInstalled() ? "install-first" : "unsupported");
        }
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("blocked");
        return;
      }
      try {
        const reg = await registration();
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const turnOn = () =>
    startTransition(async () => {
      setMessage(null);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      try {
        const reg = await registration();
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }));
        const json = sub.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };
        const res = await savePushSubscriptionAction({
          endpoint: json.endpoint,
          keys: json.keys,
        });
        if (!res.ok) {
          await sub.unsubscribe();
          setMessage({ tone: "bad", text: res.error });
          return;
        }
        setState("on");
        setMessage({
          tone: "good",
          text: "Notifications are on for this device.",
        });
      } catch {
        setMessage({
          tone: "bad",
          text: "This device could not turn on notifications. Try again.",
        });
      }
    });

  const turnOff = () =>
    startTransition(async () => {
      setMessage(null);
      try {
        const reg = await registration();
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscriptionAction(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
        setMessage({
          tone: "good",
          text: "Notifications are off for this device.",
        });
      } catch {
        setMessage({
          tone: "bad",
          text: "Could not turn them off. Try again.",
        });
      }
    });

  const test = () =>
    startTransition(async () => {
      setMessage(null);
      const res = await sendTestNotificationAction();
      setMessage(
        res.ok
          ? { tone: "good", text: "Sent. It should appear in a few seconds." }
          : { tone: "bad", text: res.error }
      );
    });

  const on = state === "on";

  return (
    <section
      aria-labelledby="notifications-title"
      className="rounded-3xl border border-outline-variant/60 bg-surface-container-low px-4 py-5 sm:px-7"
    >
      <div className="flex items-start gap-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
            on
              ? "bg-burgundy text-champagne"
              : "bg-surface-container text-gold-ink"
          }`}
          aria-hidden="true"
        >
          <Icon name={on ? "notifications" : "notifications_off"} size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            App notifications
          </p>
          <h2
            id="notifications-title"
            className="mt-1 font-display text-xl text-on-surface"
          >
            Know the moment a guest replies
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Get a notification on this device when someone RSVPs, even when
            Àríyá is closed.
          </p>
        </div>

        {(state === "on" || state === "off") && (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby="notifications-title"
            disabled={pending}
            onClick={on ? turnOff : turnOn}
            className={`relative mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-60 ${
              on ? "bg-burgundy" : "bg-outline-variant"
            }`}
          >
            <span className="sr-only">
              {on ? "Turn off notifications" : "Turn on notifications"}
            </span>
            <span
              aria-hidden="true"
              className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                on ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        )}
      </div>

      {state === "off" && (
        <button
          type="button"
          onClick={turnOn}
          disabled={pending}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-champagne disabled:opacity-60"
        >
          <Icon name="notifications" size={16} />
          {pending ? "Turning on…" : "Turn on notifications"}
        </button>
      )}

      {state === "on" && (
        <button
          type="button"
          onClick={test}
          disabled={pending}
          className="desk-chip mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold text-burgundy disabled:opacity-60"
        >
          <Icon name="outgoing_mail" size={16} />
          {pending ? "Sending…" : "Send a test notification"}
        </button>
      )}

      {state === "install-first" && (
        <p className="mt-4 rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface">
          On iPhone and iPad, add Àríyá to your Home Screen first: tap{" "}
          <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Open
          Àríyá from there and turn notifications on here.
        </p>
      )}

      {state === "blocked" && (
        <p className="mt-4 rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface">
          Notifications are blocked for Àríyá on this device. Allow them in your
          phone or browser settings (Notifications → Àríyá), then come back
          here.
        </p>
      )}

      {state === "unsupported" && (
        <p className="mt-4 text-sm text-on-surface-variant">
          This browser can&apos;t show app notifications. Try Chrome, Edge,
          Firefox or Safari, or the installed Àríyá app.
        </p>
      )}

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm font-medium ${
            message.tone === "good" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
