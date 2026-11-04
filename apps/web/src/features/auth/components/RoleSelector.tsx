"use client";

import React from "react";

interface RoleSelectorProps {
  role: "couple" | "planner";
  onChange: (role: "couple" | "planner") => void;
  disabled?: boolean;
}

export function RoleSelector({ role, onChange, disabled }: RoleSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-wine">
        I am registering as
      </legend>
      <div className="divide-y divide-outline-variant/60 border-y border-outline-variant/60">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
          <input
            className="peer sr-only"
            type="radio"
            name="account-role"
            value="couple"
            checked={role === "couple"}
            onChange={() => onChange("couple")}
            disabled={disabled}
          />
          <span className="relative mt-0.5 h-5 w-5 shrink-0 rounded-full border border-outline before:absolute before:inset-[5px] before:rounded-full before:bg-gold before:opacity-0 before:content-[''] peer-checked:border-wine peer-checked:bg-wine peer-checked:before:opacity-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy" />
          <span>
            <span className="block text-sm font-semibold text-night">
              Bride, Groom or Couple
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-label-2">
              Planning our celebration with family registers and curated tables
            </span>
          </span>
        </label>

        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
          <input
            className="peer sr-only"
            type="radio"
            name="account-role"
            value="planner"
            checked={role === "planner"}
            onChange={() => onChange("planner")}
            disabled={disabled}
          />
          <span className="relative mt-0.5 h-5 w-5 shrink-0 rounded-full border border-outline before:absolute before:inset-[5px] before:rounded-full before:bg-gold before:opacity-0 before:content-[''] peer-checked:border-wine peer-checked:bg-wine peer-checked:before:opacity-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy" />
          <span>
            <span className="block text-sm font-semibold text-night">
              Professional Event Planner
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-label-2">
              Managing luxury celebrations and milestone itineraries across
              multiple client registries
            </span>
          </span>
        </label>
      </div>
    </fieldset>
  );
}
