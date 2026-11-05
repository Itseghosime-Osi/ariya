import React from "react";
import { Icon } from "@/components/ui/icon";

/** What a guest sees if they open an invitation the host has not switched live yet. */
export function NotLiveCard({
  couple,
  title,
}: {
  couple?: string | null;
  title?: string | null;
}) {
  return (
    <article
      data-testid="invitation-not-live"
      className="rounded-3xl border border-hairline bg-white/45 p-8 text-center shadow-sm backdrop-blur-sm sm:p-10"
    >
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-wine/10 text-wine">
        <Icon name="schedule" size={26} />
      </div>
      <div className="mt-5 space-y-2">
        <span className="inline-block rounded-full bg-wine/10 px-3 py-1 text-xs font-semibold text-wine">
          Not open yet
        </span>
        <h1 className="font-serif text-2xl font-medium text-wine sm:text-3xl">
          {couple || title || "This celebration"}
        </h1>
        <p className="mx-auto max-w-md pt-1 text-sm text-on-surface-variant">
          The hosts are still getting this invitation ready. Please check back
          soon.
        </p>
      </div>
    </article>
  );
}
