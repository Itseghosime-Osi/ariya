import React from "react";
import { DocsSiteNav } from "@/components/docs/DocsSiteNav";
import { LEGAL } from "@/lib/legal/site";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ivory text-night antialiased selection:bg-gold/30">
      <DocsSiteNav />
      <div className="mx-auto max-w-[88rem] px-5 pb-16 pt-4 sm:px-8">
        {children}
      </div>
      <footer className="mx-auto max-w-[88rem] border-t border-hairline px-5 py-6 text-[13px] text-label-2 sm:px-8">
        © 2026 {LEGAL.operator}. Questions? Write to{" "}
        <a
          className="font-semibold text-burgundy underline underline-offset-2"
          href={`mailto:${LEGAL.contactEmail}`}
        >
          {LEGAL.contactEmail}
        </a>
        .
      </footer>
    </div>
  );
}
