import React from "react";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata = {
  title: "Set New Passcode • Àríyá",
  description: "Create a new passcode for your Àríyá celebration account",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
