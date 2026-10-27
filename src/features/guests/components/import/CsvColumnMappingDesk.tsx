"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { FieldMapping } from "../../csv-parser";

interface CsvColumnMappingDeskProps {
  csvHeaders: string[];
  mapping: FieldMapping;
  onMappingChange: (newMapping: FieldMapping) => void;
  onBack: () => void;
  onProceed: () => void;
}

const TARGET_FIELDS: {
  key: keyof FieldMapping;
  label: string;
  required?: boolean;
  help: string;
}[] = [
  {
    key: "name",
    label: "Full Name",
    required: true,
    help: "Guest's name or title",
  },
  {
    key: "phone",
    label: "Phone Number",
    help: "Normalized to +234 E.164 format",
  },
  {
    key: "email",
    label: "Email Address",
    help: "For digital RSVP notifications",
  },
  {
    key: "side",
    label: "Event Side",
    help: "Bride, Groom, Family, VIP, Planner, Mutual",
  },
  {
    key: "group_name",
    label: "Group / Category",
    help: "e.g. Lagos Friends, High School",
  },
  {
    key: "party_size",
    label: "Party Size",
    help: "Number of seats reserved (default 1)",
  },
  {
    key: "plus_ones_allowed",
    label: "Plus Ones Allowed",
    help: "Additional companions allowed",
  },
  { key: "is_vip", label: "VIP Status", help: "Yes/No, True/False, or 1/0" },
  {
    key: "notes",
    label: "Notes / Dietary",
    help: "Special requests or seating notes",
  },
];

export function CsvColumnMappingDesk({
  csvHeaders,
  mapping,
  onMappingChange,
  onBack,
  onProceed,
}: CsvColumnMappingDeskProps) {
  const handleFieldChange = (field: keyof FieldMapping, value: string) => {
    onMappingChange({
      ...mapping,
      [field]: value === "__unmapped__" ? null : value,
    });
  };

  const isNameMapped = Boolean(mapping.name);

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-surface-container/30 p-3 rounded-xl border border-outline-variant/40">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-wine">
          Column Field Mapping
        </h4>
        <p className="text-xs text-mist mt-0.5">
          Match columns from your uploaded CSV to Àríyá's guest registry fields.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
        {TARGET_FIELDS.map((field) => (
          <div
            key={field.key}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface">
                {field.label}{" "}
                {field.required && <span className="text-wine">*</span>}
              </span>
              <span className="text-[11px] text-mist">{field.help}</span>
            </div>

            <div className="w-full sm:w-[220px]">
              <Select
                value={mapping[field.key] || "__unmapped__"}
                onValueChange={(val) => handleFieldChange(field.key, val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Do not map" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unmapped__">
                    <span className="italic text-mist">-- Do not map --</span>
                  </SelectItem>
                  {csvHeaders.map((hdr) => (
                    <SelectItem key={hdr} value={hdr}>
                      {hdr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {!isNameMapped && (
        <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl dark:bg-red-950/40 dark:text-red-300">
          * &quot;Full Name&quot; mapping is required to continue.
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/40">
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to Upload
        </Button>
        <Button size="sm" onClick={onProceed} disabled={!isNameMapped}>
          Continue to Validation
        </Button>
      </div>
    </div>
  );
}
