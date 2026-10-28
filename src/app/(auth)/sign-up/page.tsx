import React from "react";
import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { AuthArtwork } from "@/features/auth/components/AuthArtwork";
import { Icon } from "@/components/ui/icon";

export const metadata = {
  title: "Create Account • Àríyá",
  description: "Create an account on Àríyá celebration management suite",
};

export default function SignUpPage() {
  return (
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-surface text-on-surface">
      {/* Left Column: Registration Dossier */}
      <div className="lg:col-span-6 flex flex-col justify-between px-6 sm:px-12 lg:px-16 xl:px-24 py-12 bg-surface text-on-surface">
        <div className="w-full max-w-xl mx-auto flex flex-col">
          {/* Brand & Crest Marker */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-wine text-ivory flex items-center justify-center font-display text-title-md font-bold shadow-sm">
                À
              </span>
              <div className="flex flex-col">
                <span className="font-display text-headline-sm text-wine tracking-wide leading-none">
                  Àríyá
                </span>
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest mt-1 font-bold">
                  Event Planning &amp; Guest Management
                </span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 py-1 px-3 rounded-full bg-surface-container text-wine font-label-md text-label-md">
              <Icon name="verified" className="text-gold text-base" />
              <span>Host Account</span>
            </div>
          </div>

          {/* Form */}
          <SignUpForm />

          {/* Assurance Footer */}
          <div className="mt-8 pt-6 border-t border-outline-variant/30 flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
            <span>Secure celebration workspace</span>
          </div>
        </div>
      </div>

      {/* Right Column: Editorial Brand Artwork */}
      <AuthArtwork />
    </div>
  );
}
