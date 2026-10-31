import React from "react";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata = {
  title: "Reset Passcode • Àríyá",
  description: "Request a secure passcode reset link for your Àríyá account",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
