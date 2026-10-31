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
    <label className="flex cursor-pointer select-none items-start gap-3 border-t border-outline-variant/60 pt-4">
      <input
        className="mt-1 h-4 w-4 cursor-pointer rounded accent-wine"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="text-xs leading-relaxed text-label-2">
        I agree to the Terms of Service and Privacy Policy for event and guest
        data handling.
      </span>
    </label>
  );
}
