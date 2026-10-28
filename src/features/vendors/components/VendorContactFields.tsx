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

export function VendorContactFields({
  contactName,
  contactPhone,
  contactEmail,
  onNameChange,
  onPhoneChange,
  onEmailChange,
}: VendorContactFieldsProps) {
  return (
    <div className="border-t border-outline-variant/20 pt-3 space-y-3">
      <span className="text-[10px] uppercase font-bold text-wine/70 tracking-wider block">
        Contact Details (Optional)
      </span>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-on-surface-variant mb-1">
            Contact Person
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Chef Femi"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden"
          />
        </div>
        <div>
          <label className="block font-medium text-on-surface-variant mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="0803 123 4567"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden"
          />
        </div>
      </div>
      <div>
        <label className="block font-medium text-on-surface-variant mb-1">
          Email
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="vendor@example.com"
          className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden"
        />
      </div>
    </div>
  );
}
