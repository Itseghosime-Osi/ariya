"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps) {
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const score =
    (hasMinLength ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);

  const getStrengthLabel = () => {
    if (!password) return "Enter passcode";
    if (score === 3) return "Strong Passcode";
    if (score >= 1) return "Moderate Passcode";
    return "Weak Passcode";
  };

  return (
    <div className="p-4 rounded-xl bg-surface-container flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
          Credential Strength
        </span>
        <span
          className={`font-label-sm text-label-sm font-bold ${
            score === 3
              ? "text-success"
              : score >= 1
                ? "text-secondary"
                : "text-error"
          }`}
        >
          {getStrengthLabel()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            score >= 1 ? "bg-success" : "bg-mist/30"
          }`}
        />
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            score >= 2 ? "bg-success" : "bg-mist/30"
          }`}
        />
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            score >= 3 ? "bg-success" : "bg-mist/30"
          }`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-body-sm text-body-sm">
        <div
          className={`flex items-center gap-1.5 ${
            hasMinLength ? "text-success font-semibold" : "text-mist"
          }`}
        >
          <Icon
            name={hasMinLength ? "check_circle" : "pending"}
            className="text-sm"
          />
          <span>8+ Characters</span>
        </div>
        <div
          className={`flex items-center gap-1.5 ${
            hasNumber ? "text-success font-semibold" : "text-mist"
          }`}
        >
          <Icon
            name={hasNumber ? "check_circle" : "pending"}
            className="text-sm"
          />
          <span>1+ Number</span>
        </div>
        <div
          className={`flex items-center gap-1.5 ${
            hasSpecial ? "text-success font-semibold" : "text-mist"
          }`}
        >
          <Icon
            name={hasSpecial ? "check_circle" : "pending"}
            className="text-sm"
          />
          <span>1+ Special symbol</span>
        </div>
      </div>
    </div>
  );
}
