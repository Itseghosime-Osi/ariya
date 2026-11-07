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
  title = "Seating & Floor Plan",
  children,
}: {
  backHref: string;
  /** The page's own name. The workspace keeps it as the screen's heading. */
  title?: string;
  eventTitle?: string;
  /** A short line after the event name: the hall's size and whether it has saved. */
  detail?: string;
  /** Sits at the end of the bar: the mode switch. */
  children?: ReactNode;
}) {
  return (
    <div className="flex max-w-full items-center gap-1 rounded-full border border-black/[0.06] bg-white/95 p-1 pr-4 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_30px_-12px_rgba(28,7,13,0.35)] backdrop-blur">
      <BackLink
        href={backHref}
        aria-label="Back"
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-night px-4 text-xs font-semibold text-white transition-colors hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back
      </BackLink>
      <div className="ml-2 min-w-0">
        <h1 className="truncate font-display text-[15px] font-bold leading-tight text-night">
          {title}
        </h1>
        <p className="truncate text-[11px] leading-tight text-label-2">
          {[eventTitle, detail].filter(Boolean).join(" · ")}
        </p>
      </div>
      {children && (
        <div className="ml-3 hidden border-l border-hairline pl-3 min-[1440px]:block">
          {children}
        </div>
      )}
    </div>
  );
}
