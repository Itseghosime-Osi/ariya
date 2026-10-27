import React from "react";
import Link from "next/link";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { AuthArtwork } from "@/features/auth/components/AuthArtwork";

export const metadata = {
  title: "Sign In • Àríyá",
  description: "Sign in to your Àríyá celebration management suite",
};

export default function SignInPage() {
  return (
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-surface text-on-surface">
      {/* Left Column: Authentication Canvas (6 cols) */}
      <div className="lg:col-span-6 flex flex-col justify-between px-6 py-10 sm:px-12 md:px-16 lg:px-20 xl:px-24 bg-surface-bright">
        {/* Top Brand Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
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
                Celebration Management &amp; Registry Suite
              </span>
            </div>
          </div>
        </div>

        {/* Main Form Component */}
        <React.Suspense
          fallback={
            <div className="my-10 h-96 animate-pulse bg-surface-container rounded-2xl" />
          }
        >
          <SignInForm />
        </React.Suspense>

        {/* Footer & Legal */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-body-sm text-body-sm text-on-surface-variant">
          <div>
            <span>New to Àríyá?</span>
            <Link
              className="text-wine font-semibold hover:underline ml-1"
              href="/sign-up"
            >
              Create an account
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              className="hover:text-night transition-colors"
              href="/site/product.html"
            >
              About Àríyá
            </Link>
            <span className="text-outline-variant">•</span>
            <span>© 2026 Àríyá</span>
          </div>
        </div>
      </div>

      {/* Right Column: Editorial Brand Artwork (6 cols) */}
      <AuthArtwork />
    </div>
  );
}
