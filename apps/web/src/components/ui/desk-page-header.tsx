import React from "react";

/**
 * The heading band for a desk page: a gold eyebrow, a display title, one line of what the page is
 * for, and the page's primary action. Shared so Vendors, Team and Billing open the same way.
 */
export function DeskPageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
          {eyebrow}
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold leading-[1.05] text-night sm:text-4xl [overflow-wrap:anywhere]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-label-2">
          {description}
        </p>
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      ) : null}
    </header>
  );
}
