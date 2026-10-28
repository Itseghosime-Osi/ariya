"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";

interface ReviewSectionProps {
  icon: string;
  heading: string;
  onEdit: () => void;
  children: React.ReactNode;
}

export function ReviewSection({
  icon,
  heading,
  onEdit,
  children,
}: ReviewSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-label-md text-label-md text-secondary uppercase tracking-widest flex items-center gap-2 font-bold">
          <Icon name={icon} className="text-base text-wine" />
          {heading}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="font-label-md text-label-md text-wine hover:underline font-semibold"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}
