"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CsvParseResult } from "../../csv-parser";
import { CheckCircle2, AlertCircle, AlertTriangle, Users } from "lucide-react";

interface CsvValidationPreviewProps {
  validation: CsvParseResult;
  skipDuplicates: boolean;
  isSubmitting: boolean;
  onToggleSkipDuplicates: (skip: boolean) => void;
  onBack: () => void;
  onCommitImport: () => void;
}

export function CsvValidationPreview({
  validation,
  skipDuplicates,
  isSubmitting,
  onToggleSkipDuplicates,
  onBack,
  onCommitImport,
}: CsvValidationPreviewProps) {
  const { validRows, errorRows, duplicateRows } = validation;
  const countToImport = skipDuplicates
    ? validRows.length
    : validRows.length + duplicateRows.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {validRows.length}
            </div>
            <div className="text-[11px] text-emerald-800 dark:text-emerald-400">
              Valid Rows
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {duplicateRows.length}
            </div>
            <div className="text-[11px] text-amber-800 dark:text-amber-400">
              Duplicates
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <div className="text-lg font-bold text-red-700 dark:text-red-300">
              {errorRows.length}
            </div>
            <div className="text-[11px] text-red-800 dark:text-red-400">
              Errors
            </div>
          </div>
        </div>
      </div>

      {duplicateRows.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container/50 border border-outline-variant/40">
          <div className="flex items-center gap-2">
            <Checkbox
              id="skip-dupes"
              checked={skipDuplicates}
              onCheckedChange={(val) => onToggleSkipDuplicates(!!val)}
            />
            <label
              htmlFor="skip-dupes"
              className="text-xs cursor-pointer text-on-surface"
            >
              Skip duplicates automatically (matches phone, email, or name)
            </label>
          </div>
          <span className="text-[11px] text-mist">
            {skipDuplicates ? "Skipping" : "Importing anyway"}
          </span>
        </div>
      )}

      <div className="max-h-[260px] overflow-y-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
        <Table>
          <TableHeader className="bg-surface-container/60 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-xs font-semibold">Row #</TableHead>
              <TableHead className="text-xs font-semibold">Name</TableHead>
              <TableHead className="text-xs font-semibold">
                Phone / Email
              </TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validRows.slice(0, 15).map((row, idx) => (
              <TableRow key={`valid-${idx}`}>
                <TableCell className="text-xs text-mist font-mono">
                  {idx + 1}
                </TableCell>
                <TableCell className="text-xs font-medium text-on-surface">
                  {row.name}
                </TableCell>
                <TableCell className="text-xs text-mist">
                  {row.phone || row.email || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="confirmed" className="text-[10px]">
                    Valid
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-mist">
                  Ready to import
                </TableCell>
              </TableRow>
            ))}

            {duplicateRows.slice(0, 10).map((row) => (
              <TableRow key={`dup-${row.rowIndex}`} className="bg-amber-50/30">
                <TableCell className="text-xs text-mist font-mono">
                  {row.rowIndex}
                </TableCell>
                <TableCell className="text-xs font-medium text-on-surface">
                  {row.guest.name}
                </TableCell>
                <TableCell className="text-xs text-mist">
                  {row.guest.phone || row.guest.email || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="awaiting" className="text-[10px]">
                    Duplicate
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-amber-700">
                  Matches {row.matchType} ({row.duplicateWith})
                </TableCell>
              </TableRow>
            ))}

            {errorRows.slice(0, 10).map((row) => (
              <TableRow key={`err-${row.rowIndex}`} className="bg-red-50/30">
                <TableCell className="text-xs text-mist font-mono">
                  {row.rowIndex}
                </TableCell>
                <TableCell className="text-xs font-medium text-on-surface">
                  Row #{row.rowIndex}
                </TableCell>
                <TableCell className="text-xs text-mist">-</TableCell>
                <TableCell>
                  <Badge variant="declined" className="text-[10px]">
                    Error
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-red-600 truncate max-w-[200px]">
                  {row.errors.join(", ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/40">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back to Mapping
        </Button>
        <Button
          size="sm"
          onClick={onCommitImport}
          disabled={countToImport === 0 || isSubmitting}
        >
          {isSubmitting ? (
            "Importing..."
          ) : (
            <>
              <Users className="h-4 w-4 mr-1.5" />
              Import {countToImport} {countToImport === 1 ? "Guest" : "Guests"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
