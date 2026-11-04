import React from "react";
import { Icon } from "@/components/ui/icon";
import { MonogramSeal } from "@/features/events/components/desk/MonogramSeal";

export function AuthArtwork() {
  return (
    <aside className="relative hidden h-full min-h-0 flex-col justify-between overflow-hidden bg-[#1c070d] p-12 text-ivory lg:flex xl:p-16">
      <div className="desk-aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div
        className="weave absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
      />
      <div className="desk-grain absolute inset-0" aria-hidden="true" />

      <header className="relative z-10 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
          Àríyá Celebration Suite
        </span>
        <span className="text-xs text-ivory/60">Host Workspace</span>
      </header>

      <div className="relative z-10 my-auto w-full max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
          Made for the joy of bringing people together
        </p>
        <h2 className="mt-5 max-w-[14ch] font-display text-5xl font-semibold leading-[1.08] text-ivory xl:text-6xl">
          Make room for a little more joy.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-ivory/70">
          From the first invitation to the last dance, keep your people and
          every thoughtful detail close.
        </p>

        <div className="mt-10 flex items-center gap-6 border-y border-[#e9c98a]/20 py-5">
          <div
            className="relative grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full xl:h-36 xl:w-36"
            aria-hidden="true"
          >
            <div className="absolute inset-0 rounded-full border border-[#e9c98a]/25" />
            <div className="absolute inset-3 rounded-full border border-[#e9c98a]/20" />
            <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(233,201,138,0.24),transparent_72%)] blur-md" />
            <MonogramSeal
              text="Àríyá"
              size={104}
              className="relative h-24 w-24 drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] xl:h-28 xl:w-28"
            />
            <span className="foil-sheen rounded-full" />
          </div>
          <p className="font-display text-2xl leading-snug text-ivory/90 xl:text-3xl">
            Invite <span className="text-[#e9c98a]">·</span> Gather{" "}
            <span className="text-[#e9c98a]">·</span> Celebrate
          </p>
        </div>
      </div>

      <footer className="relative z-10 flex items-center justify-between border-t border-[#e9c98a]/20 pt-5 text-xs text-ivory/60">
        <span className="inline-flex items-center gap-2">
          <Icon name="shield" size={15} className="text-[#e9c98a]" />
          Secure celebration workspace
        </span>
        <span>Àríyá 2026</span>
      </footer>
    </aside>
  );
}
