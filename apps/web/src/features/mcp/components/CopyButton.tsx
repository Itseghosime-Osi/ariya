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
}: {
  value: string;
  label?: string;
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
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/50 bg-transparent px-4 text-xs font-semibold text-wine transition-colors hover:border-gold hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
    >
      <Icon
        name={copied ? "check" : "copy"}
        size={15}
        className="text-gold-ink"
      />
      {copied ? "Copied" : label}
    </button>
  );
}
