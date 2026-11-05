"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

interface ScreenHeaderProps {
  title: string;
  /** A small line under the title, such as the celebration's name. */
  subtitle?: string;
  /** Where Back goes when there is no earlier page in this tab to return to. */
  backHref: string;
  /** One action on the right: a link, or a button that opens something. */
  action?: {
    icon: IconName;
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const CIRCLE =
  "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-hairline bg-white/45 text-night backdrop-blur-sm transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/**
 * A phone screen's own bar, as in a native app: Back on the left, the title in the middle and one
 * action on the right. It shows only in the installed app on a phone, where it stands in for the
 * app's top bar on account screens (Settings, Profile). In a browser, and from tablet width up,
 * the page keeps the website's top bar and its large heading.
 */
export function ScreenHeader({
  title,
  subtitle,
  backHref,
  action,
}: ScreenHeaderProps) {
  const router = useRouter();
  const back = () => {
    // Return to wherever they came from inside the app; a fresh tab goes to backHref.
    const cameFromApp =
      typeof document !== "undefined" &&
      document.referrer.startsWith(window.location.origin);
    if (cameFromApp && window.history.length > 1) router.back();
    else router.push(backHref);
  };

  return (
    <div
      data-screen-header
      className="sticky top-0 z-30 -mx-4 -mt-6 mb-5 hidden grid-cols-[44px_1fr_44px] items-center gap-3 border-b border-hairline bg-[#f7f2e8]/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md [-webkit-backdrop-filter:blur(10px)] sm:-mx-6 sm:px-6 standalone:max-md:grid"
    >
      <button type="button" onClick={back} aria-label="Back" className={CIRCLE}>
        <Icon name="chevron_left" size={20} />
      </button>
      <div className="min-w-0 text-center">
        <h1 className="truncate font-display text-[1.35rem] font-semibold leading-none text-night">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 truncate text-[11px] leading-none text-label-2">
            {subtitle}
          </p>
        )}
      </div>
      {action?.href ? (
        <Link href={action.href} aria-label={action.label} className={CIRCLE}>
          <Icon name={action.icon} size={17} />
        </Link>
      ) : action?.onClick ? (
        <button
          type="button"
          onClick={action.onClick}
          aria-label={action.label}
          className={CIRCLE}
        >
          <Icon name={action.icon} size={17} />
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}
