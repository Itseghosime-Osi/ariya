"use client";

import { CheckCircle2, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CsvImportSummaryProps {
  importedCount: number;
  skippedCount: number;
  onDone: () => void;
}

export function CsvImportSummary({
  importedCount,
  skippedCount,
  onDone,
}: CsvImportSummaryProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 dark:bg-emerald-950/40">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <h3 className="font-serif text-2xl font-bold text-on-surface">
        Import Completed!
      </h3>
      <p className="mt-1 text-sm text-on-surface-variant max-w-sm">
        Successfully imported guests into your event registry. Unique RSVP
        tokens have been automatically generated.
      </p>

      <div className="my-6 grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="p-4 rounded-2xl bg-surface-container/60 border border-outline-variant/40">
          <div className="font-serif text-3xl font-bold text-wine">
            {importedCount}
          </div>
          <div className="text-xs text-mist mt-1">Guests Added</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container/60 border border-outline-variant/40">
          <div className="font-serif text-3xl font-bold text-on-surface">
            {skippedCount}
          </div>
          <div className="text-xs text-mist mt-1">Rows Skipped</div>
        </div>
      </div>

      <Button onClick={onDone} className="w-full max-w-xs">
        <Users className="h-4 w-4 mr-2" />
        View Guest Registry
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
