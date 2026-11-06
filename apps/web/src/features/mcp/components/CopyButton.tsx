"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * Copies a value the host is about to paste somewhere else. The label swap is the only feedback, so
 * it resets on its own and never leaves the button reading "Copied" after the fact.
 */
export function CopyButton({
  value,
  label = "Copy",
  tone = "light",
}: {
  value: string;
  label?: string;
  /** "dark" for use on a burgundy card. */
  tone?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the value is on screen and selectable either way.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label}d` : label}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        tone === "dark"
          ? "border-[#f6e2ad]/60 text-[#fff6dc] hover:bg-white/10 focus-visible:outline-[#f6e2ad]"
          : "border-gold/50 bg-transparent text-wine hover:border-gold hover:bg-gold/10 focus-visible:outline-burgundy"
      }`}
    >
      <Icon
        name={copied ? "check" : "copy"}
        size={15}
        className={tone === "dark" ? "text-[#f6e2ad]" : "text-gold-ink"}
      />
      {copied ? "Copied" : label}
    </button>
  );
}
