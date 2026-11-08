"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/auth/oauth";

function GoogleMark() {
  // Google's own four-colour "G", as their sign-in guidelines ask.
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

/** Sends the person to Google to choose an account; Google then returns them to /auth/callback. */
export function GoogleButton({
  next,
  label,
}: {
  next?: string | null;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function start() {
    setBusy(true);
    setFailed(false);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthCallbackUrl(window.location.origin, next),
        queryParams: { prompt: "select_account" },
      },
    });
    // On success the browser is already on its way to Google; only a refusal comes back here.
    if (error) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="desk-chip flex min-h-12 w-full items-center justify-center gap-3 rounded-full px-6 text-sm font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? "Opening Google…" : label}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-red-900">
          Google sign-in is not available right now. Please use your email and
          password.
        </p>
      )}
    </div>
  );
}

export function OrDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-hairline" />
      <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-label-2">
        {children}
      </span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}
