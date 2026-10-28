import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-headline-lg text-3xl md:text-4xl font-semibold text-primary tracking-tight font-display">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm md:text-base text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </header>
  );
}
