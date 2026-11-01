"use client";

import { useActionState, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  UNKNOWN_APP_ACKNOWLEDGEMENT,
  sanitiseAppName,
  type AppTrust,
} from "../app-trust";
import { decideConsentAction } from "../consent";

export interface ConsentRequest {
  authorizationId: string;
  clientName: string;
  clientLogo: string;
  redirectHost: string;
  accountEmail: string;
  scopes: string[];
  /** Classified on the server from the redirect URI. The card only renders it. */
  trust: AppTrust;
}

const SCOPE_COPY: Record<string, string> = {
  openid: "Confirm which Àríyá account is connecting",
  email: "See the email address on your account",
  profile: "See your name and profile details",
  phone: "See the phone number on your account",
};

const ACKNOWLEDGEMENT =
  "I understand this app has not been verified by Àríyá. I am choosing to connect it at my own risk, and I accept responsibility for what it does with my account and my guests' information.";

export function ConsentCard({ request }: { request: ConsentRequest }) {
  const [state, formAction, pending] = useActionState(
    decideConsentAction,
    null
  );
  const [acknowledged, setAcknowledged] = useState(false);

  const unverified = request.trust.tier === "unknown";
  // The server decides again; this only stops an accidental click.
  const approveBlocked = pending || (unverified && !acknowledged);

  useEffect(() => {
    if (state?.ok) {
      window.location.assign(state.redirectUrl);
    }
  }, [state]);

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-[28px] border border-wine/10 bg-surface-container-lowest p-7 shadow-[0_18px_50px_-30px_rgba(28,7,13,0.4)] sm:p-9">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
          <Icon name="link" size={14} />
          Connection request
        </p>

        <div className="mt-5 flex items-start gap-4">
          {request.trust.tier === "known" && request.clientLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={request.clientLogo}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl border border-outline-variant/60 object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className={
                unverified
                  ? "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-error/10 text-error"
                  : "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-wine/10 font-display text-xl font-bold text-wine"
              }
            >
              {unverified ? (
                <Icon name="help" size={22} />
              ) : (
                displayName(request).slice(0, 1).toUpperCase()
              )}
            </span>
          )}

          <div className="min-w-0">
            <TrustBadge trust={request.trust} />
            <h1 className="mt-2 break-words font-display text-2xl leading-tight text-night">
              {displayName(request)} wants to connect
            </h1>
            <p className="mt-1.5 text-sm text-on-surface-variant">
              Signed in as{" "}
              <span className="font-medium text-night">
                {request.accountEmail}
              </span>
              . This is not a request from Àríyá.
            </p>
          </div>
        </div>

        {unverified ? (
          <div className="mt-5 rounded-2xl border border-error/40 bg-error/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-error">
              <Icon name="error" size={16} className="shrink-0" />
              This app has not been verified
            </p>
            <p className="mt-2 text-xs leading-relaxed text-on-surface">
              Anyone can register an app and choose its name and logo. What you
              approve here will be handed to whoever controls this address:
            </p>
            <p className="mt-2.5 break-all rounded-xl border border-error/25 bg-surface-container-lowest px-3 py-2 font-mono text-xs text-night">
              {request.trust.redirectUri}
            </p>
            <p className="mt-2.5 text-xs leading-relaxed text-on-surface-variant">
              If that address is not a service you recognise, deny the request.
            </p>
          </div>
        ) : null}

        <div className="mt-6 border-t border-wine/10 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-label-2">
            It is asking for
          </p>
          <ul className="mt-3 space-y-2.5">
            {request.scopes.map((scope) => (
              <li
                key={scope}
                className="flex items-start gap-2.5 text-sm text-on-surface"
              >
                <Icon
                  name="check_circle"
                  size={16}
                  className="mt-0.5 shrink-0 text-gold-ink"
                />
                <span>{SCOPE_COPY[scope] ?? `Access to ${scope}`}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 rounded-2xl bg-ivory p-4 text-xs leading-relaxed text-on-surface-variant">
          If you approve, this app can read the celebrations you have access to
          and make changes to the ones you own or plan. It cannot see your
          password, and you can revoke access later from Connect your AI in your
          account menu.
        </p>

        {unverified ? null : (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-label-2">
            <Icon name="lock" size={13} className="shrink-0 text-gold-ink" />
            <span>
              You will be sent back to{" "}
              <span className="font-medium text-night">
                {request.redirectHost}
              </span>
            </span>
          </p>
        )}

        {state && !state.ok ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-wine/30 bg-wine/5 p-3 text-xs font-medium text-wine"
          >
            {state.error}
          </p>
        ) : null}

        <form action={formAction} className="mt-6">
          <input
            type="hidden"
            name="authorization_id"
            value={request.authorizationId}
          />

          {unverified ? (
            <label className="mb-4 flex cursor-pointer select-none items-start gap-3 rounded-2xl border border-error/30 bg-error/5 p-3.5">
              <input
                type="checkbox"
                name="acknowledge_unknown_app"
                value={UNKNOWN_APP_ACKNOWLEDGEMENT}
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                disabled={pending}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-wine"
              />
              <span className="text-xs leading-relaxed text-on-surface">
                {ACKNOWLEDGEMENT}
              </span>
            </label>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
            <Button
              type="submit"
              name="decision"
              value="approve"
              disabled={approveBlocked}
              className="w-full rounded-full shadow-[0_6px_18px_-6px_rgba(74,17,29,0.55)] sm:w-auto"
            >
              {pending ? "Saving…" : "Approve"}
            </Button>
            <Button
              type="submit"
              name="decision"
              value="deny"
              variant="outline"
              disabled={pending}
              className="w-full rounded-full sm:w-auto"
            >
              Deny
            </Button>
          </div>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-label-2">
        Not sure? Deny the request and ask the app&apos;s developer what it
        needs.
      </p>
    </div>
  );
}

/**
 * The name is chosen by the app, so an unverified one is cleaned and cut short rather than allowed
 * to fill the card with something that looks like a warning or a promise.
 */
function displayName(request: ConsentRequest): string {
  return request.trust.tier === "unknown"
    ? sanitiseAppName(request.clientName)
    : request.clientName;
}

function TrustBadge({ trust }: { trust: AppTrust }) {
  if (trust.tier === "known") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-ink">
        <Icon name="verified" size={12} />
        Known app
      </span>
    );
  }

  if (trust.tier === "local") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/70 bg-surface-container px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        <Icon name="person" size={12} />
        An app on your own computer
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-error/40 bg-error/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-error">
      <Icon name="error" size={12} />
      Not verified
    </span>
  );
}
