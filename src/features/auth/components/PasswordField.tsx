"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  iconName?: string;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  placeholder = "••••••••••••",
  iconName = "lock",
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          name={iconName}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-outline pointer-events-none"
          aria-hidden="true"
        />
        <input
          className="w-full bg-paper text-night font-body-md text-body-md pl-11 pr-11 py-3 rounded-xl shadow-inner outline-none transition-all focus:bg-surface-container-lowest"
          id={id}
          placeholder={placeholder}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          disabled={disabled}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-wine min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setShow(!show)}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          <Icon
            name={show ? "visibility_off" : "visibility"}
            className="text-lg"
          />
        </button>
      </div>
    </div>
  );
}
