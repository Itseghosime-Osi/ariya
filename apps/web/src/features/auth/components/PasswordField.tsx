"use client";

import React, { useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  iconName?: IconName;
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
          className="desk-field min-h-12 w-full rounded-2xl py-3 pl-11 pr-11 text-base text-night outline-none placeholder:text-label-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
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
          <Icon name={show ? "visibility" : "visibility"} className="text-lg" />
        </button>
      </div>
    </div>
  );
}
