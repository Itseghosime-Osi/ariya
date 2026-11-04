"use client";

import { useEffect, useState, useTransition } from "react";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
} from "./actions";

export type AppNotificationState =
  "loading" | "unsupported" | "install-first" | "blocked" | "off" | "on";

export interface AppNotificationMessage {
  tone: "good" | "bad";
  text: string;
}

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

function registration() {
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

/**
 * App notifications for this device: whether they can be used here, whether they are on, and the
 * three things a person can do (turn on, turn off, send a test).
 */
export function useAppNotifications(publicKey: string | undefined) {
  const [state, setState] = useState<AppNotificationState>("loading");
  const [message, setMessage] = useState<AppNotificationMessage | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported =
        Boolean(publicKey) &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      let next: AppNotificationState;
      if (!supported) {
        // iPhone and iPad only offer notifications to apps added to the Home Screen.
        next = isIos() && !isInstalled() ? "install-first" : "unsupported";
      } else if (Notification.permission === "denied") {
        next = "blocked";
      } else {
        try {
          const sub = await (
            await registration()
          ).pushManager.getSubscription();
          next = sub ? "on" : "off";
        } catch {
          next = "unsupported";
        }
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

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
            applicationServerKey: urlBase64ToUint8Array(publicKey!),
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
        const sub = await (await registration()).pushManager.getSubscription();
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

  const sendTest = () =>
    startTransition(async () => {
      setMessage(null);
      const res = await sendTestNotificationAction();
      setMessage(
        res.ok
          ? { tone: "good", text: "Sent. It should appear in a few seconds." }
          : { tone: "bad", text: res.error }
      );
    });

  return { state, message, pending, turnOn, turnOff, sendTest };
}
