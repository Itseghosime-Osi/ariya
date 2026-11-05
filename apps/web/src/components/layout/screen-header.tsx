"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

interface ScreenHeaderProps {
  title: string;
  /** Where Back goes when there is no earlier page in this tab to return to. */
  backHref: string;
  action?: { href: string; icon: IconName; label: string };
}

const CIRCLE =
  "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-hairline bg-white/45 text-night backdrop-blur-sm transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/**
 * A phone screen's own bar, as in a native app: Back on the left, the title in the middle and one
 * action on the right. It shows only in the installed app on a phone, where it stands in for the
 * app's top bar on account screens (Settings, Profile). In a browser, and from tablet width up,
 * the page keeps the website's top bar and its large heading.
 */
/** Back to wherever they came from inside the app; a fresh tab goes to backHref. */
function useBack(backHref: string) {
  const router = useRouter();
  return () => {
    const cameFromApp =
      typeof document !== "undefined" &&
      document.referrer.startsWith(window.location.origin);
    if (cameFromApp && window.history.length > 1) router.back();
    else router.push(backHref);
  };
}

export function ScreenHeader({ title, backHref, action }: ScreenHeaderProps) {
  const back = useBack(backHref);

  return (
    <div
      data-screen-header
      className="sticky top-0 z-30 -mx-4 -mt-6 mb-5 hidden grid-cols-[44px_1fr_44px] items-center gap-3 border-b border-hairline bg-[#f7f2e8]/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md [-webkit-backdrop-filter:blur(10px)] sm:-mx-6 sm:px-6 standalone:max-md:grid"
    >
      <button type="button" onClick={back} aria-label="Back" className={CIRCLE}>
        <Icon name="chevron_left" size={20} />
      </button>
      <h1 className="truncate text-center font-display text-[1.35rem] font-semibold leading-none text-night">
        {title}
      </h1>
      {action ? (
        <Link href={action.href} aria-label={action.label} className={CIRCLE}>
          <Icon name={action.icon} size={17} />
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * The installed app's Back on tablets and computers, where the page keeps its large heading:
 * a small pill above it. Browsers have their own Back, so it never shows in a browser tab.
 */
export function BackLink({
  backHref,
  label = "Back",
}: {
  backHref: string;
  label?: string;
}) {
  const back = useBack(backHref);
  return (
    <button
      type="button"
      onClick={back}
      data-back-link
      className="mb-4 hidden h-9 items-center gap-1 rounded-full border border-hairline bg-white/40 pl-2 pr-3.5 text-[13px] font-semibold text-night transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy standalone:md:inline-flex"
    >
      <Icon name="chevron_left" size={18} />
      {label}
    </button>
  );
}
