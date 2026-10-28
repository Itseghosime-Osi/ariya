"use client";

import React from "react";

interface RoleSelectorProps {
  role: "couple" | "planner";
  onChange: (role: "couple" | "planner") => void;
  disabled?: boolean;
}

export function RoleSelector({ role, onChange, disabled }: RoleSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold">
        I Am Registering As
      </label>
      <div className="grid grid-cols-1 gap-3">
        {/* Couple Option */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("couple")}
          className={`text-left flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
            role === "couple"
              ? "bg-paper shadow-sm ring-1 ring-gold"
              : "bg-surface-container hover:bg-paper"
          }`}
        >
          <div
            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
              role === "couple" ? "bg-wine text-ivory" : "bg-surface-dim"
            }`}
          >
            {role === "couple" && (
              <div className="w-2 h-2 rounded-full bg-gold" />
            )}
          </div>
          <div className="flex flex-col pr-2">
            <span className="font-title-md text-title-md text-night font-semibold">
              Bride, Groom or Couple
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Planning our celebration with family registers and curated tables
            </span>
          </div>
        </button>

        {/* Planner Option */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("planner")}
          className={`text-left flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
            role === "planner"
              ? "bg-paper shadow-sm ring-1 ring-gold"
              : "bg-surface-container hover:bg-paper"
          }`}
        >
          <div
            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
              role === "planner" ? "bg-wine text-ivory" : "bg-surface-dim"
            }`}
          >
            {role === "planner" && (
              <div className="w-2 h-2 rounded-full bg-gold" />
            )}
          </div>
          <div className="flex flex-col pr-2">
            <span className="font-title-md text-title-md text-night font-semibold">
              Professional Event Planner
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Managing luxury celebrations and milestone itineraries across
              multiple client registries
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
