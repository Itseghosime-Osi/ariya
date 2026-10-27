import React from "react";
import { Icon } from "@/components/ui/icon";

export function AuthArtwork() {
  return (
    <div className="hidden lg:col-span-6 lg:flex flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-night text-ivory">
      {/* Ambient Regal Gradients */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-wine/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

      {/* Top Badge / Hallmark */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-wine/60 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-gold font-bold">
            High-Society Wedding Guild
          </span>
        </div>
        <div className="font-body-sm text-body-sm text-stone-300 tracking-wide">
          Private Client Portal
        </div>
      </div>

      {/* Center Editorial Narrative & Stationery Specimen Card */}
      <div className="relative z-10 my-auto py-10 flex flex-col space-y-8">
        {/* Bodoni Quotation */}
        <div className="space-y-4 max-w-lg">
          <span className="font-display text-display text-gold/30 block leading-none select-none">
            “
          </span>
          <p className="font-display text-headline-lg xl:text-display text-ivory leading-tight -mt-4">
            Every Owambe is a tapestry of honour, ancestry, and joyous memory.
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <span className="w-8 h-px bg-gold/50" />
            <span className="font-label-md text-label-md tracking-widest uppercase text-gold">
              Protocol &amp; Grace
            </span>
          </div>
        </div>

        {/* Tactile Wedding Stationery Specimen Card */}
        <div className="w-full max-w-md bg-paper text-night rounded-2xl p-7 shadow-2xl relative overflow-hidden group">
          {/* Champagne Gold Top Highlight Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gold via-secondary-container to-gold" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">
                Ceremonial Registry
              </span>
              <h3 className="font-headline-sm text-headline-sm text-primary leading-snug">
                Chidinma &amp; Babatunde Adeleke
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Solemnization &amp; Grand Reception • Victoria Island, Lagos
              </p>
            </div>
            {/* Wax Seal Motif Stamp */}
            <div className="w-12 h-12 rounded-full bg-wine flex items-center justify-center shrink-0 shadow-md">
              <Icon name="verified" className="text-gold text-2xl" />
            </div>
          </div>

          {/* Micro Registry Details Grid */}
          <div className="grid grid-cols-3 gap-2 mt-6 pt-5 bg-surface-container-high/60 rounded-xl p-3">
            <div className="space-y-0.5">
              <span className="font-label-sm text-label-sm text-stone-700 font-semibold uppercase tracking-wider block">
                Tables
              </span>
              <span className="font-title-md text-title-md text-night font-bold">
                48 VIP
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="font-label-sm text-label-sm text-stone-700 font-semibold uppercase tracking-wider block">
                Aṣọ-Ẹbí
              </span>
              <span className="font-title-md text-title-md text-success font-bold">
                100% Set
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="font-label-sm text-label-sm text-stone-700 font-semibold uppercase tracking-wider block">
                Guaranteed
              </span>
              <span className="font-title-md text-title-md text-night font-bold">
                620 Roster
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Live Wedding Orchestration
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-wine font-semibold flex items-center space-x-1">
              <span>Victoria Island, Lagos</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Status Pill */}
      <div className="relative z-10 flex items-center justify-between text-stone-300 pt-6">
        <div className="flex items-center space-x-2 font-body-sm text-body-sm">
          <Icon name="verified_user" className="text-gold text-base" />
          <span>Encrypted Session • Session-bound Cookies</span>
        </div>
        <span className="font-label-sm text-label-sm text-gold">
          Lagos • London • Atlanta
        </span>
      </div>
    </div>
  );
}
