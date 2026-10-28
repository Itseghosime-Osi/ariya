"use client";

import React from "react";

interface SignUpTermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SignUpTermsCheckbox({
  checked,
  onChange,
  disabled,
}: SignUpTermsCheckboxProps) {
  return (
    <label className="flex items-start gap-3 p-3.5 rounded-xl bg-paper cursor-pointer select-none">
      <input
        className="mt-1 rounded text-wine accent-wine w-4 h-4 cursor-pointer"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
        I agree to the Terms of Service and Privacy Policy for event and guest
        data handling.
      </span>
    </label>
  );
}
