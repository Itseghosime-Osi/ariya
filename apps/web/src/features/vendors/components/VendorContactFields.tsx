"use client";

import React from "react";

interface VendorContactFieldsProps {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  onNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onEmailChange: (val: string) => void;
}

const LABEL = "text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink";
const FIELD =
  "desk-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none";

export function VendorContactFields({
  contactName,
  contactPhone,
  contactEmail,
  onNameChange,
  onPhoneChange,
  onEmailChange,
}: VendorContactFieldsProps) {
  return (
    <div className="space-y-3 border-t border-outline-variant/40 pt-4">
      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-label-3">
        Contact details (optional)
      </span>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="vendor-contact-name" className={LABEL}>
            Contact Person
          </label>
          <input
            id="vendor-contact-name"
            type="text"
            value={contactName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Chef Femi"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="vendor-contact-phone" className={LABEL}>
            Phone
          </label>
          <input
            id="vendor-contact-phone"
            type="tel"
            value={contactPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="0803 123 4567"
            className={`${FIELD} tabular-nums`}
          />
        </div>
      </div>
      <div>
        <label htmlFor="vendor-contact-email" className={LABEL}>
          Email
        </label>
        <input
          id="vendor-contact-email"
          type="email"
          value={contactEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="vendor@example.com"
          className={FIELD}
        />
      </div>
    </div>
  );
}
