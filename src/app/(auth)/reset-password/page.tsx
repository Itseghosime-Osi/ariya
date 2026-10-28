import React from "react";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata = {
  title: "Set New Passcode • Àríyá",
  description: "Create a new passcode for your Àríyá celebration account",
};

export default function ResetPasswordPage() {
  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-surface text-on-surface">
      <div className="mb-8 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md">
          <span className="text-gold font-display text-headline-sm select-none">
            À
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-display text-headline-sm text-primary tracking-wide">
            Àríyá
          </span>
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">
            Passcode Security
          </span>
        </div>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
