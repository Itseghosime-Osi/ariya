import React from "react";
import { Icon, type IconName } from "@/components/ui/icon";

interface GuestNoticeProps {
  icon: IconName;
  /** The small chip above the title: what state the invitation is in. */
  badge: string;
  title: string;
  /** An italic line under the title, such as "The Celebration of Ada & Femi". */
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  testId?: string;
}

/**
 * A guest's invitation page when there is nothing to reply to: a link that does not match, a
 * celebration that has ended, a deadline that has passed, an invitation not open yet. One calm card
 * in the app's own style, with the reason in plain words.
 */
export function GuestNotice({
  icon,
  badge,
  title,
  subtitle,
  children,
  action,
  testId,
}: GuestNoticeProps) {
  return (
    <article
      data-testid={testId}
      className="rounded-3xl border border-hairline bg-white/40 p-8 text-center shadow-[0_24px_48px_-32px_rgba(42,10,20,0.35)] backdrop-blur-sm sm:p-10"
    >
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-burgundy/10 text-burgundy ring-1 ring-gold/50">
        <Icon name={icon} size={26} />
      </div>
      <div className="mt-5 space-y-2">
        <span className="inline-block rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink">
          {badge}
        </span>
        <h1 className="font-display text-2xl font-semibold leading-tight text-night sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="font-serif text-base italic text-label-2">{subtitle}</p>
        )}
        <div
          aria-hidden="true"
          className="mx-auto flex w-32 items-center gap-2 pt-1 text-gold-ink"
        >
          <span className="h-px flex-1 bg-current opacity-40" />
          <span className="text-[10px] leading-none">✦</span>
          <span className="h-px flex-1 bg-current opacity-40" />
        </div>
        <div className="mx-auto max-w-md pt-1 text-sm leading-relaxed text-label-2">
          {children}
        </div>
      </div>
      {action && <div className="mt-6">{action}</div>}
    </article>
  );
}
