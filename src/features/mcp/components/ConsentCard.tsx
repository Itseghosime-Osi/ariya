"use client";

import { useActionState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { decideConsentAction } from "../consent";

export interface ConsentRequest {
  authorizationId: string;
  clientName: string;
  clientLogo: string;
  redirectHost: string;
  accountEmail: string;
  scopes: string[];
}

const SCOPE_COPY: Record<string, string> = {
  openid: "Confirm which Àríyá account is connecting",
  email: "See the email address on your account",
  profile: "See your name and profile details",
  phone: "See the phone number on your account",
};

export function ConsentCard({ request }: { request: ConsentRequest }) {
  const [state, formAction, pending] = useActionState(
    decideConsentAction,
    null
  );

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
          {request.clientLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={request.clientLogo}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl border border-outline-variant/60 object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-wine/10 font-display text-xl font-bold text-wine"
            >
              {request.clientName.slice(0, 1).toUpperCase()}
            </span>
          )}

          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight text-night">
              {request.clientName} wants to connect
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
          password, and you can revoke access later from your account settings.
        </p>

        <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-label-2">
          <Icon name="lock" size={13} className="shrink-0 text-gold-ink" />
          <span>
            You will be sent back to{" "}
            <span className="font-medium text-night">
              {request.redirectHost}
            </span>
          </span>
        </p>

        {state && !state.ok ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-wine/30 bg-wine/5 p-3 text-xs font-medium text-wine"
          >
            {state.error}
          </p>
        ) : null}

        <form
          action={formAction}
          className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:justify-start"
        >
          <input
            type="hidden"
            name="authorization_id"
            value={request.authorizationId}
          />
          <Button
            type="submit"
            name="decision"
            value="approve"
            disabled={pending}
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
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-label-2">
        Not sure? Deny the request and ask the app&apos;s developer what it
        needs.
      </p>
    </div>
  );
}
