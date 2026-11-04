import React from "react";
import { SignUpForm } from "@/features/auth/components/SignUpForm";

export const metadata = {
  title: "Create Account • Àríyá",
  description: "Create an account on Àríyá celebration management suite",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
