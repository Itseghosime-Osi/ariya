"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { disconnectApp } from "../grants";
import type { ConnectedApp } from "../types";

// Fixed locale and zone so the server and client render the same string.
const DATE = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

export function ConnectedApps({
  initialApps,
}: {
  initialApps: ConnectedApp[];
}) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function disconnect(clientId: string) {
    setPendingId(clientId);
    setError(null);

    const result = await disconnectApp(clientId);

    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmId(null);
    router.refresh();
  }

  if (initialApps.length === 0) {
    return (
      <p className="rounded-[22px] border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm text-on-surface-variant">
        Nothing is connected yet. Connect an app above, approve it on the
        sign-in screen, and it will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {initialApps.map((app) => {
          const confirming = confirmId === app.clientId;
          const pending = pendingId === app.clientId;

          return (
            <li
              key={app.clientId}
              className="rounded-[22px] border border-wine/10 bg-surface-container-low p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {app.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={app.logoUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl border border-outline-variant/60 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wine/10 font-display text-base font-bold text-wine"
                    >
                      {app.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-medium text-on-surface">
                      {app.name}
                    </p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      Connected {DATE.format(new Date(app.grantedAt))}
                    </p>
                  </div>
                </div>

                {confirming ? (
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setConfirmId(null)}
                      className="flex-1 rounded-full sm:flex-none"
                    >
                      Keep it
                    </Button>
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() => disconnect(app.clientId)}
                      className="flex-1 rounded-full sm:flex-none"
                    >
                      {pending ? "Disconnecting…" : "Yes, disconnect"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setConfirmId(app.clientId);
                    }}
                    className="w-full rounded-full border-gold/50 bg-transparent sm:w-auto"
                  >
                    <Icon
                      name="link"
                      size={15}
                      className="mr-2 text-gold-ink"
                    />
                    Disconnect
                  </Button>
                )}
              </div>

              {confirming ? (
                <p
                  role="status"
                  className="mt-3 text-xs leading-relaxed text-on-surface-variant"
                >
                  {app.name} will lose access immediately — the next tool it
                  calls is refused. You can invite it back whenever you like.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-wine/30 bg-wine/5 p-3 text-xs font-medium text-wine"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
