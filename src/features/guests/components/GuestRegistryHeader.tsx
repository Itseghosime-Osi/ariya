"use client";

import { Button } from "@/components/ui/button";
import { UserPlus, Upload } from "lucide-react";

interface GuestRegistryHeaderProps {
  onOpenImport: () => void;
  onOpenAdd: () => void;
}

export function GuestRegistryHeader({
  onOpenImport,
  onOpenAdd,
}: GuestRegistryHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-on-surface">
          Guest Registry
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Curate attendance, manage party sizes, and generate unique digital
          RSVP invitations.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onOpenImport}
          className="border-outline-variant shadow-sm"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
        <Button onClick={onOpenAdd} className="shadow-sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Guest
        </Button>
      </div>
    </div>
  );
}
