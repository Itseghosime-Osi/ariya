import React from "react";
import { Icon, IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "celebration",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-dashed border-outline-variant/60 bg-surface-container-lowest/70 p-12 text-center flex flex-col items-center justify-center space-y-4",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-secondary-container/40 flex items-center justify-center text-wine">
        <Icon name={icon} size={28} />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="font-display text-xl font-medium text-primary">
          {title}
        </h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
