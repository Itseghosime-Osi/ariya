"use client";

import { Button } from "@/components/ui/button";

interface GuestRegistryHeaderProps {
  eventName: string;
  onOpenImport: () => void;
  onOpenAdd: () => void;
}

export function GuestRegistryHeader({
  eventName,
  onOpenImport,
  onOpenAdd,
}: GuestRegistryHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
          {eventName}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-on-surface sm:text-4xl">
          Guest Registry
        </h1>
      </div>

      <div className="flex w-full items-center justify-between gap-5 sm:w-auto sm:justify-end">
        <button
          type="button"
          onClick={onOpenImport}
          className="min-h-11 text-sm font-semibold text-on-surface-variant underline decoration-outline-variant underline-offset-4 hover:text-wine"
        >
          Import CSV
        </button>
        <Button onClick={onOpenAdd} className="rounded-full px-6">
          Add guest
        </Button>
      </div>
    </div>
  );
}
