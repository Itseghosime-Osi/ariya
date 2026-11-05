"use client";

import { Upload, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuestRegistryHeaderProps {
  eventName: string;
  onOpenImport: () => void;
  onOpenAdd: () => void;
  ended?: boolean;
}

export function GuestRegistryHeader({
  eventName,
  onOpenImport,
  onOpenAdd,
  ended = false,
}: GuestRegistryHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-5">
      <div className="min-w-0 standalone:max-md:hidden">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
          {eventName}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold leading-tight text-on-surface sm:mt-2 sm:text-5xl">
          Guest Registry
        </h1>
        <p className="mt-2 hidden max-w-xl text-sm text-on-surface-variant sm:block">
          Who is coming, who still owes a reply, and who needs a seat.
        </p>
      </div>

      <div className="flex w-full items-center gap-3 standalone:max-md:w-auto sm:w-auto">
        <Button
          variant="outline"
          onClick={onOpenImport}
          disabled={ended}
          className="flex-1 rounded-full border-gold/50 bg-transparent px-5 standalone:max-md:flex-none hover:border-gold hover:bg-gold/10 sm:flex-none"
        >
          <Upload className="mr-2 h-4 w-4 text-gold-ink" />
          Import CSV
        </Button>
        <Button
          onClick={onOpenAdd}
          disabled={ended}
          className="flex-1 rounded-full px-6 standalone:max-md:hidden shadow-[0_6px_18px_-6px_rgba(74,17,29,0.55)] transition-transform hover:-translate-y-0.5 sm:flex-none"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add guest
        </Button>
      </div>
    </div>
  );
}
