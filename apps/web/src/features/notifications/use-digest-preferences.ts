"use client";

import { useState, useTransition } from "react";
import { saveNotificationPreferences } from "./preferences";
import type { NotificationPreferences } from "./preference-types";

export interface DigestMessage {
  tone: "good" | "bad";
  text: string;
}

/**
 * The weekly digest and quiet hours, as the settings page sees them (6.4.2).
 *
 * The switch is the only control that writes on its own: a host flicking "off" expects it to stay
 * off, not to have to press save. The quiet hours are two time fields, so they write through a
 * separate call once both are valid.
 */
export function useDigestPreferences(initial: NotificationPreferences) {
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(initial);
  const [message, setMessage] = useState<DigestMessage | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (next: NotificationPreferences) =>
    startTransition(async () => {
      setMessage(null);
      const previous = preferences;
      // The switch moves the moment it is tapped; a failed save puts it back, so the screen never
      // claims a setting that was not stored.
      setPreferences(next);
      const result = await saveNotificationPreferences(next);
      if (result.error) {
        setPreferences(previous);
        setMessage({ tone: "bad", text: result.error });
        return;
      }
      setMessage({
        tone: "good",
        text:
          next.digest === "off"
            ? "Reminders are off."
            : "Saved. The weekly digest arrives on Monday mornings.",
      });
    });

  return {
    preferences,
    message,
    pending,
    setDigest: (digest: NotificationPreferences["digest"]) =>
      save({ ...preferences, digest }),
    setQuietHours: (quietFrom: string, quietTo: string) =>
      save({ ...preferences, quietFrom, quietTo }),
  };
}
