"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Icon } from "@/components/ui/icon";
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

type ImportStep = "upload" | "mapping" | "validation" | "summary";

export function CsvImportPageFlow({ eventId }: { eventId: string }) {
  const router = useRouter();
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
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to parse CSV file"
      );
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
        setErrorMsg(
          res.error || "Import failed. Please check the data format."
        );
        return;
      }
      setImportedCount(res.data?.count ?? candidates.length);
      setSkippedCount(skipped);
      setStep("summary");
      router.refresh();
    } catch {
      setErrorMsg("An unexpected server error occurred during import");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href={`/events/${eventId}/guests`}
          className="text-xs text-wine hover:underline flex items-center gap-1 font-semibold"
        >
          <Icon name="arrow_back" className="text-sm" />
          <span>Back to Guest Roster</span>
        </Link>
        <span className="text-xs text-on-surface-variant font-medium">
          Step{" "}
          {step === "upload"
            ? "1"
            : step === "mapping"
              ? "2"
              : step === "validation"
                ? "3"
                : "4"}{" "}
          of 4
        </span>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2">
          <Icon name="error" className="text-base" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-surface-container-low p-6 sm:p-8 rounded-2xl border border-outline-variant/30 shadow-sm">
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
            onDone={() => router.push(`/events/${eventId}/guests`)}
          />
        )}
      </div>
    </div>
  );
}
