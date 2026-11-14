"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Enrolment {
  factorId: string;
  qr: string;
  secret: string;
}

/**
 * The admin desk's second step. The first time, it sets up an authenticator app (scan the code,
 * type the six digits it shows); after that it only asks for the six digits.
 */
export function SecondStep({
  hasAuthenticator,
}: {
  hasAuthenticator: boolean;
}) {
  const router = useRouter();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  // First visit: start setting up an authenticator, clearing any half-finished attempt first.
  useEffect(() => {
    if (hasAuthenticator || started.current) return;
    started.current = true;
    const supabase = createClient();
    void (async () => {
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Àríyá admin ${new Date().toISOString().slice(0, 10)}`,
      });
      if (err || !data) {
        setError(
          err?.message ?? "Could not start setting up the authenticator."
        );
        return;
      }
      setEnrolment({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    })();
  }, [hasAuthenticator]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Type the six digits your authenticator app shows.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    let factorId = enrolment?.factorId;
    if (!factorId) {
      const { data } = await supabase.auth.mfa.listFactors();
      factorId = data?.totp.find((f) => f.status === "verified")?.id;
    }
    if (!factorId) {
      setBusy(false);
      setError("No authenticator is set up yet. Reload this page.");
      return;
    }
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (err) {
      setBusy(false);
      setCode("");
      setError("That code did not match. Wait for a fresh code and try again.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  const setup = !hasAuthenticator;

  return (
    <div className="mx-auto w-full max-w-md rounded-[28px] border border-hairline bg-white/50 p-7 shadow-[0_24px_48px_-30px_rgba(42,10,20,0.4)] sm:p-9">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
        Admin desk
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-night">
        {setup ? "Set up two-step sign-in" : "Enter your code"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        {setup
          ? "The admin desk holds every customer's data, so it asks for a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password and the like) as well as your password."
          : "Open your authenticator app and type the six-digit code for Àríyá."}
      </p>

      {setup && (
        <div className="mt-6">
          {enrolment ? (
            <>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-on-surface-variant">
                <li>Open your authenticator app and add an account.</li>
                <li>Scan this code, or type the key below it.</li>
                <li>Type the six digits the app shows.</li>
              </ol>
              {/* The QR code is an SVG data URL made by the auth server, not an external image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrolment.qr}
                alt="QR code to add Àríyá to your authenticator app"
                width={180}
                height={180}
                className="mx-auto mt-5 rounded-xl bg-white p-2"
              />
              <p className="mt-3 text-center text-xs text-on-surface-variant">
                Key:{" "}
                <code
                  data-testid="totp-secret"
                  className="select-all break-all font-mono text-night"
                >
                  {enrolment.secret}
                </code>
              </p>
            </>
          ) : (
            !error && (
              <p className="text-sm text-on-surface-variant">
                Preparing your code…
              </p>
            )
          )}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <label
          htmlFor="admin-code"
          className="text-sm font-semibold text-night"
        >
          Six-digit code
        </label>
        <input
          id="admin-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="min-h-12 rounded-xl border border-outline-variant bg-white px-4 text-center font-mono text-2xl tracking-[0.4em] text-night focus-visible:outline-2 focus-visible:outline-burgundy"
          aria-describedby={error ? "admin-code-error" : undefined}
          disabled={busy || (setup && !enrolment)}
        />
        {error && (
          <p id="admin-code-error" role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || (setup && !enrolment)}>
          {busy ? "Checking…" : "Open the admin desk"}
        </Button>
      </form>
    </div>
  );
}
