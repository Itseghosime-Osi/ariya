"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/layout/screen-header";
import { DeskPageHeader } from "@/components/ui/desk-page-header";
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
      handleCsvText(await file.text());
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to parse CSV file"
      );
    }
  };

  // A file and a phonebook both arrive here as CSV text, so they share the mapping and checks.
  const handleCsvText = (text: string) => {
    try {
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

  const stepNo =
    step === "upload"
      ? 1
      : step === "mapping"
        ? 2
        : step === "validation"
          ? 3
          : 4;
  const STEPS = ["Upload", "Match", "Check", "Done"];

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24 sm:space-y-6 sm:pb-8">
      <ScreenHeader
        title="Import guests"
        subtitle="From a spreadsheet"
        backHref={`/events/${eventId}/guests`}
      />
      <div className="standalone:max-md:hidden">
        <DeskPageHeader
          eyebrow="Guest list"
          title="Import Guest Registry"
          description="Upload CSV spreadsheets, map columns, detect duplicates, and import guests."
        >
          <Link
            href={`/events/${eventId}/guests`}
            className="desk-chip inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="arrow_back" className="text-sm" />
            Back to Guest Roster
          </Link>
        </DeskPageHeader>
      </div>

      <ol aria-label={`Step ${stepNo} of 4`} className="grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i + 1 === stepNo ? "step" : undefined}
            className="min-w-0"
          >
            <span
              aria-hidden="true"
              className={`block h-1.5 rounded-full ${
                i + 1 <= stepNo
                  ? "bg-gradient-to-r from-[#f6e2ad] to-[#d4a85a]"
                  : "bg-hairline"
              }`}
            />
            <span
              className={`mt-1.5 block truncate text-[12px] font-semibold ${
                i + 1 === stepNo ? "text-burgundy" : "text-label-2"
              }`}
            >
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 p-4 text-[13px] font-semibold text-red-900"
        >
          <Icon name="error" className="text-base" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bento-card p-5 sm:p-8">
        {step === "upload" && (
          <CsvUploadDropzone
            onFileSelected={handleFileSelected}
            onCsvText={handleCsvText}
          />
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
