"use client";

import * as React from "react";
import { UploadCloud, FileText, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_FILE_SIZE_BYTES } from "../../csv-parser";

interface CsvUploadDropzoneProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
}

export function CsvUploadDropzone({
  onFileSelected,
  isLoading,
}: CsvUploadDropzoneProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validateAndHandleFile = (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Please select a valid CSV (.csv) file");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(
        "File size exceeds 2MB limit. Please upload a smaller CSV file."
      );
      return;
    }
    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Full Name,Phone Number,Email,Side,Group,Party Size,VIP,Plus Ones,Notes\n" +
      "Adeola Balogun,08023456789,adeola@example.com,Bride,Bridal Party,1,Yes,1,Bridal train member\n" +
      "Emeka Okafor,+2348039876543,emeka@example.com,Groom,University Friends,2,No,0,Vegetarian";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ariya_guest_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          dragOver
            ? "scale-[1.01] border-burgundy bg-burgundy/5"
            : "border-gold/50 bg-transparent hover:border-gold hover:bg-gold/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              validateAndHandleFile(e.target.files[0]);
            }
          }}
        />

        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-burgundy text-ivory shadow-[0_8px_20px_-8px_rgba(74,17,29,0.6)] ring-4 ring-gold/30 transition-transform duration-200 group-hover:-translate-y-0.5">
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ivory border-t-transparent" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
        </div>

        <h3 className="font-display text-2xl font-bold text-night">
          Upload Guest CSV Roster
        </h3>
        <p className="mt-1 text-xs text-label-2 max-w-sm">
          Drag and drop your spreadsheet here, or browse files. Max 500 rows and
          2MB per upload.
        </p>

        <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
          {["Name", "Phone", "Email", "Side", "Group", "Party size"].map(
            (field) => (
              <li
                key={field}
                className="rounded-full border border-hairline bg-ivory px-2.5 py-0.5 text-[11px] font-medium text-label-2"
              >
                {field}
              </li>
            )
          )}
        </ul>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pointer-events-none mt-5 min-h-11 rounded-full border-gold/50 px-5"
        >
          <FileText className="h-4 w-4 mr-2" />
          Browse CSV File
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-1 border-t border-hairline px-2 pt-3 text-xs text-label-2 sm:flex-row">
        <span>Need a sample file to get started?</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDownloadTemplate}
          className="min-h-11 text-xs text-burgundy hover:bg-burgundy/10 hover:text-burgundy"
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Download Sample Template (.csv)
        </Button>
      </div>
    </div>
  );
}
