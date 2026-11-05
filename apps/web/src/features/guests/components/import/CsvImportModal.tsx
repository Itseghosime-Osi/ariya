"use client";

import * as React from "react";
import Papa from "papaparse";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FORM_DIALOG, ModalHeader } from "@/components/ui/modal-header";
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
      <DialogContent className={`${FORM_DIALOG} max-w-2xl`}>
        <ModalHeader
          icon="upload"
          eyebrow="Guest registry"
          title={
            step === "summary" ? "Import Summary" : "Import Guests from CSV"
          }
          description="Bring in a whole spreadsheet at once. You can review everything before it is added."
        >
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
                        ? "border border-champagne/30 text-champagne/60"
                        : state === "current"
                          ? "bg-gold text-night"
                          : "bg-[#6fd3a0] text-night"
                    }`}
                  >
                    {state === "done" ? "✓" : index + 1}
                  </span>
                  <span
                    className={`hidden sm:inline ${
                      state === "current"
                        ? "text-[#fff6dc]"
                        : "text-champagne/60"
                    }`}
                  >
                    {item.label}
                  </span>
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`h-px w-5 sm:w-8 ${
                        index < stepIndex ? "bg-gold" : "bg-champagne/25"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </ModalHeader>

        <div className="flex flex-col gap-4 px-5 pb-5 pt-4 sm:px-7">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error-container px-3 py-2 text-xs text-error"
            >
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
