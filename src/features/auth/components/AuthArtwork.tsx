import React from "react";
import { Icon } from "@/components/ui/icon";

export function AuthArtwork() {
  return (
    <div className="hidden lg:col-span-6 lg:flex flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-night text-ivory">
      {/* Ambient Gradients */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-wine/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

      {/* Top Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-wine/60 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-gold" />
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-gold font-bold">
            Àríyá Celebration Suite
          </span>
        </div>
        <div className="font-body-sm text-body-sm text-stone-300 tracking-wide">
          Host Workspace
        </div>
      </div>

      {/* Center Editorial Narrative & Example Card */}
      <div className="relative z-10 my-auto py-10 flex flex-col space-y-8">
        <div className="space-y-4 max-w-lg">
          <p className="font-display text-headline-lg xl:text-display text-ivory leading-tight">
            Event hosting made simple, from invitation to reception.
          </p>
          <p className="font-body-md text-body-md text-stone-300 leading-relaxed">
            Personal RSVP links for every guest, a guest list that updates
            itself, interactive table seating, and door check-in.
          </p>
        </div>

        {/* Clear Example Preview Card */}
        <div className="w-full max-w-md bg-paper text-night rounded-2xl p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gold via-secondary-container to-gold" />

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-wine font-semibold">
                Example Celebration
              </span>
              <h3 className="font-headline-sm text-headline-sm text-primary leading-snug">
                Sample Event Desk
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Preview of celebration tools and guest management
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-wine/10 flex items-center justify-center shrink-0">
              <Icon name="celebration" className="text-wine text-xl" />
            </div>
          </div>

          {/* 4 Real Features */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-5 bg-surface-container-high/60 rounded-xl p-3.5 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-wine font-semibold">
                <Icon name="link" className="text-sm" />
                <span>Personal RSVPs</span>
              </div>
              <p className="text-stone-700 text-[11px]">
                Unique links per guest
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-wine font-semibold">
                <Icon name="sync" className="text-sm" />
                <span>Self-Updating List</span>
              </div>
              <p className="text-stone-700 text-[11px]">Real-time headcounts</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-wine font-semibold">
                <Icon name="chair" className="text-sm" />
                <span>Table Seating</span>
              </div>
              <p className="text-stone-700 text-[11px]">
                Floor plan &amp; charts
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-wine font-semibold">
                <Icon name="qr_code_scanner" className="text-sm" />
                <span>Door Check-in</span>
              </div>
              <p className="text-stone-700 text-[11px]">
                QR passes &amp; codes
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Active synchronization</span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant italic">
              Example demonstration
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Status Pill */}
      <div className="relative z-10 flex items-center justify-between text-stone-300 pt-6">
        <div className="flex items-center space-x-2 font-body-sm text-body-sm">
          <Icon name="verified_user" className="text-gold text-base" />
          <span>Secure celebration workspace</span>
        </div>
        <span className="font-label-sm text-label-sm text-stone-400">
          Àríyá 2026
        </span>
      </div>
    </div>
  );
}
