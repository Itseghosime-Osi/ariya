"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";

interface AuthFeedbackAlertProps {
  error?: string | null;
  success?: string | null;
}

export function AuthFeedbackAlert({ error, success }: AuthFeedbackAlertProps) {
  if (success) {
    return (
      <div
        className="rounded-xl p-4 bg-success-surface border border-success/30 flex items-start space-x-3 mb-6 shadow-sm"
        role="status"
      >
        <Icon
          name="check_circle"
          className="text-success text-xl shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <h4 className="font-label-md text-label-md text-success font-semibold">
            Success
          </h4>
          <p className="font-body-sm text-body-sm text-paper-ink">{success}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-4 bg-error-container/80 flex items-start space-x-3 mb-6 shadow-sm"
        role="alert"
      >
        <Icon
          name="error"
          className="text-error text-xl shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <h4 className="font-label-md text-label-md text-on-error-container font-semibold">
            Action Required
          </h4>
          <p className="font-body-sm text-body-sm text-on-error-container leading-relaxed">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
