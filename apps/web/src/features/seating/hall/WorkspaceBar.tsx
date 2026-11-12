import type { ReactNode } from "react";
import { BackLink } from "@/components/layout/back-link";
import { ArrowLeft } from "lucide-react";

/**
 * The only chrome the seating workspace keeps from the app: a way back, and what you are looking at.
 * The page heading lives here so the screen still has one, and it names the event so a host with
 * several knows which hall this is.
 */
export function WorkspaceBar({
  backHref,
  eventTitle,
  detail,
  status,
  title = "Seating & Floor Plan",
}: {
  backHref: string;
  /** The page's own name. The workspace keeps it as the screen's heading. */
  title?: string;
  eventTitle?: string;
  /** A short note after the event name, such as the hall's size. */
  detail?: string;
  /** Whether the hall is saved, on the same quiet line as the event name. */
  status?: ReactNode;
}) {
  // Compact, like the invitation designer's bar: a round back button, the page's name, and one
  // small line under it with the event, the hall size and whether it is saved. The mode switch
  // and the actions live on the right of the same top bar.
  return (
    <div className="flex min-w-0 max-w-full items-center gap-3">
      <BackLink
        href={backHref}
        aria-label="Back"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-hairline bg-white text-night transition-colors hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <ArrowLeft size={17} aria-hidden="true" />
      </BackLink>
      <div className="min-w-0">
        <h1 className="truncate font-display text-[15px] font-bold leading-tight text-night">
          {title}
        </h1>
        {/* The save status comes first, so a long event name is what gets cut short. */}
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-tight text-label-2">
          {status && (
            <>
              <span className="shrink-0">{status}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="truncate">
            {[eventTitle, detail].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
    </div>
  );
}
