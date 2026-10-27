"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ValidatedGuestRow } from "../../schemas";

interface CsvDuplicateRowProps {
  rowIndex: number;
  guest: ValidatedGuestRow;
  matchType: string;
  duplicateWith: string;
  isSkipped: boolean;
  onToggleSkip: () => void;
}

export function CsvDuplicateRow({
  rowIndex,
  guest,
  matchType,
  duplicateWith,
  isSkipped,
  onToggleSkip,
}: CsvDuplicateRowProps) {
  return (
    <TableRow className="bg-amber-50/30">
      <TableCell className="text-xs text-mist font-mono">{rowIndex}</TableCell>
      <TableCell className="text-xs font-medium text-on-surface">
        {guest.name}
      </TableCell>
      <TableCell className="text-xs text-mist">
        {guest.phone || guest.email || "-"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={`dup-row-${rowIndex}`}
            checked={!isSkipped}
            onCheckedChange={onToggleSkip}
          />
          <label
            htmlFor={`dup-row-${rowIndex}`}
            className="text-[11px] cursor-pointer"
          >
            {isSkipped ? "Skip" : "Keep"}
          </label>
        </div>
      </TableCell>
      <TableCell className="text-xs text-amber-700">
        Matches existing {matchType} ({duplicateWith})
      </TableCell>
    </TableRow>
  );
}
