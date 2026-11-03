import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { AuthArtwork } from "@/features/auth/components/AuthArtwork";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      data-auth-shell
      className="relative isolate h-dvh overflow-hidden bg-ivory text-night"
    >
      <div className="grid h-full min-h-0 lg:grid-cols-2">
        <section className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto overscroll-contain px-5 pb-5 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8 sm:pb-7 sm:pt-[calc(1.75rem+env(safe-area-inset-top))] lg:px-12 xl:px-16">
          <header className="sticky top-0 z-10 -mx-5 flex items-center justify-between gap-4 bg-ivory/95 px-5 pb-3 pt-1 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16">
            <Link
              href="/product"
              className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy"
            >
              <span
                aria-hidden="true"
                className="grid h-11 w-11 place-items-center rounded-full border border-gold/50 bg-wine font-display text-2xl font-bold text-gold shadow-[0_8px_22px_-10px_rgba(74,17,29,0.8)]"
              >
                À
              </span>
              <span className="flex flex-col">
                <span className="font-display text-2xl leading-none text-wine">
                  Àríyá
                </span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-label-2">
                  Celebration desk
                </span>
              </span>
            </Link>
            <span className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-ink sm:inline-flex">
              <Icon name="verified" size={15} />A suite for hosts
            </span>
          </header>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-7 sm:py-10 lg:py-8">
            <p className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink lg:hidden">
              <Icon name="celebration" size={15} />
              Every yes, together
            </p>
            {children}
          </div>

          <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-wine/10 pt-4 text-xs text-label-2">
            <span className="inline-flex items-center gap-2">
              <Icon name="lock" size={14} className="text-gold-ink" />A secure
              space for every celebration
            </span>
            <div className="flex items-center gap-4">
              <Link
                href="/product"
                className="transition-colors hover:text-wine"
              >
                About Àríyá
              </Link>
              <span>© 2026</span>
            </div>
          </footer>
        </section>

        <AuthArtwork />
      </div>
    </main>
  );
}
