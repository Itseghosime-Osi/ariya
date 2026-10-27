"use client";

import * as React from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
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
  type FieldMapping,
  type CsvParseResult,
} from "../../csv-parser";
import { importGuestsAction } from "../../actions";
import type { ExistingGuestIdentifier } from "../../schemas";

interface CsvImportModalProps {
  eventId: string;
  isOpen: boolean;
  existingGuests: ExistingGuestIdentifier[];
  onClose: () => void;
  onImportComplete: () => void;
}

type ImportStep = "upload" | "mapping" | "validation" | "summary";

export function CsvImportModal({
  eventId,
  isOpen,
  existingGuests,
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
  const [skipDuplicates, setSkipDuplicates] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [importedCount, setImportedCount] = React.useState(0);
  const [skippedCount, setSkippedCount] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const resetState = () => {
    setStep("upload");
    setCsvText("");
    setCsvHeaders([]);
    setValidation(null);
    setSkipDuplicates(true);
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

  const handleProceedToValidation = () => {
    const valResult = parseGuestCsvContent(csvText, mapping, existingGuests);
    setValidation(valResult);
    setStep("validation");
  };

  const handleCommitImport = async () => {
    if (!validation) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const candidates = skipDuplicates
      ? validation.validRows
      : [
          ...validation.validRows,
          ...validation.duplicateRows.map((d) => d.guest),
        ];

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {step === "summary" ? "Import Summary" : "Import Guests from CSV"}
          </DialogTitle>
        </DialogHeader>

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
            skipDuplicates={skipDuplicates}
            isSubmitting={isSubmitting}
            onToggleSkipDuplicates={setSkipDuplicates}
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
      </DialogContent>
    </Dialog>
  );
}
