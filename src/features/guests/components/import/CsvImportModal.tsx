"use client";

import * as React from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CsvUploadDropzone } from "./CsvUploadDropzone";
import { CsvColumnMappingDesk } from "./CsvColumnMappingDesk";
import { CsvValidationPreview } from "./CsvValidationPreview";
import { CsvImportSummary } from "./CsvImportSummary";
import {
  autoDetectColumnMapping,
  parseGuestCsvContent,
  mergeRemoteDuplicates,
  type FieldMapping,
  type CsvParseResult,
} from "../../csv-parser";
import { importGuestsAction, findImportDuplicatesAction } from "../../actions";
import type { ValidatedGuestRow } from "../../schemas";

interface CsvImportModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type ImportStep = "upload" | "mapping" | "validation" | "summary";

const STEPS: { key: ImportStep; label: string }[] = [
  { key: "upload", label: "Choose file" },
  { key: "mapping", label: "Match columns" },
  { key: "validation", label: "Review" },
  { key: "summary", label: "Done" },
];

export function CsvImportModal({
  eventId,
  isOpen,
  onClose,
  onImportComplete,
}: CsvImportModalProps) {
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [csvText, setCsvText] = React.useState<string>("");
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<FieldMapping>({
    name: null,
    phone: null,
    email: null,
    party_size: null,
    side: null,
    group_name: null,
    plus_ones_allowed: null,
    is_vip: null,
    notes: null,
  });
  const [validation, setValidation] = React.useState<CsvParseResult | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [importedCount, setImportedCount] = React.useState(0);
  const [skippedCount, setSkippedCount] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const stepIndex = STEPS.findIndex((item) => item.key === step);

  const resetState = () => {
    setStep("upload");
    setCsvText("");
    setCsvHeaders([]);
    setValidation(null);
    setIsSubmitting(false);
    setErrorMsg(null);
  };

  const handleFileSelected = async (file: File) => {
    try {
      const text = await file.text();
      setCsvText(text);
      const preview = Papa.parse<Record<string, string>>(text, {
        header: true,
        preview: 2,
      });
      const headers = preview.meta.fields ?? [];
      setCsvHeaders(headers);
      const initialMapping = autoDetectColumnMapping(headers);
      setMapping(initialMapping);
      setStep("mapping");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse CSV file";
      setErrorMsg(message);
    }
  };

  const handleProceedToValidation = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const localResult = parseGuestCsvContent(csvText, mapping, []);
      if (localResult.validRows.length > 0) {
        const rowsToCheck = localResult.validRows.map((r) => ({
          name: r.name,
          phone: r.phone ?? null,
          email: r.email ?? null,
        }));
        const dupRes = await findImportDuplicatesAction(eventId, rowsToCheck);
        if (dupRes.ok && dupRes.data && dupRes.data.length > 0) {
          const merged = mergeRemoteDuplicates(localResult, dupRes.data);
          setValidation(merged);
          setStep("validation");
          return;
        }
      }
      setValidation(localResult);
      setStep("validation");
    } catch {
      setErrorMsg("Failed to check duplicates against event records");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommitImport = async (candidates: ValidatedGuestRow[]) => {
    if (!validation) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const skipped = validation.totalRows - candidates.length;

    try {
      const res = await importGuestsAction(eventId, candidates);
      if (!res.ok) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
        return;
      }

      setImportedCount(res.data?.count ?? candidates.length);
      setSkippedCount(skipped);
      setStep("summary");
      onImportComplete();
    } catch {
      setErrorMsg("An unexpected server error occurred during import");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetState();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto border border-gold/30 bg-ivory p-0">
        <DialogHeader className="relative gap-1.5 px-6 pb-5 pt-7 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            Guest registry
          </p>
          <DialogTitle className="font-serif text-3xl font-bold leading-tight">
            {step === "summary" ? "Import Summary" : "Import Guests from CSV"}
          </DialogTitle>
          <DialogDescription>
            Bring in a whole spreadsheet at once. You can review everything
            before it is added.
          </DialogDescription>
          <ol
            aria-label="Import progress"
            className="mt-3 flex items-center gap-2 text-xs font-semibold"
          >
            {STEPS.map((item, index) => {
              const state =
                index < stepIndex
                  ? "done"
                  : index === stepIndex
                    ? "current"
                    : "todo";
              return (
                <li
                  key={item.key}
                  aria-current={state === "current" ? "step" : undefined}
                  className="flex items-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors ${
                      state === "todo"
                        ? "border border-outline-variant text-on-surface-variant"
                        : state === "current"
                          ? "bg-wine text-ivory"
                          : "bg-gold text-night"
                    }`}
                  >
                    {state === "done" ? "✓" : index + 1}
                  </span>
                  <span
                    className={`hidden sm:inline ${
                      state === "current"
                        ? "text-on-surface"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {item.label}
                  </span>
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`h-px w-5 sm:w-8 ${
                        index < stepIndex ? "bg-gold" : "bg-outline-variant"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          <span
            aria-hidden="true"
            className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-gold/70 via-gold/20 to-transparent sm:inset-x-8"
          />
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 pb-6 pt-5 sm:px-8">
          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {step === "upload" && (
            <CsvUploadDropzone onFileSelected={handleFileSelected} />
          )}

          {step === "mapping" && (
            <CsvColumnMappingDesk
              csvHeaders={csvHeaders}
              mapping={mapping}
              onMappingChange={setMapping}
              onBack={() => setStep("upload")}
              onProceed={handleProceedToValidation}
            />
          )}

          {step === "validation" && validation && (
            <CsvValidationPreview
              validation={validation}
              isSubmitting={isSubmitting}
              onBack={() => setStep("mapping")}
              onCommitImport={handleCommitImport}
            />
          )}

          {step === "summary" && (
            <CsvImportSummary
              importedCount={importedCount}
              skippedCount={skippedCount}
              onDone={() => {
                resetState();
                onClose();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
