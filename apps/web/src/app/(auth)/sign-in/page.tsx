import React from "react";
import { SignInForm } from "@/features/auth/components/SignInForm";

export const metadata = {
  title: "Sign In • Àríyá",
  description: "Sign in to your Àríyá celebration management suite",
};

export default function SignInPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-96 animate-pulse border-y border-outline-variant/50" />
      }
    >
      <SignInForm />
    </React.Suspense>
  );
}
