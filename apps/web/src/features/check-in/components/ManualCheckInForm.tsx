"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";

interface ManualCheckInFormProps {
  loading: boolean;
  onCheckIn: (code: string) => Promise<void>;
}

export function ManualCheckInForm({
  loading,
  onCheckIn,
}: ManualCheckInFormProps) {
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    await onCheckIn(cleanCode);
    setCode("");
  };

  return (
    <form onSubmit={handleSubmit} className="bento-card space-y-4 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Icon name="edit" className="text-base text-gold-ink" />
        <h2 className="font-display text-lg font-bold text-night">
          Manual Code &amp; Pass Lookup
        </h2>
      </div>

      <div>
        <label
          htmlFor="entry-code"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink"
        >
          Personal Entry Code / Pass Token
        </label>
        <input
          id="entry-code"
          type="text"
          required
          autoComplete="off"
          autoCapitalize="characters"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. ARY-7K2M-99NP"
          className="desk-field min-h-12 w-full rounded-2xl px-4 font-mono text-base uppercase tracking-wider text-night outline-hidden placeholder:text-label-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[13px] text-label-2">
          <Icon name="info" className="text-sm text-gold-ink" />
          Press Enter to verify the pass
        </span>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-6 text-sm font-semibold text-ivory shadow-sm transition-colors hover:bg-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-50"
        >
          {loading ? (
            "Checking…"
          ) : (
            <>
              <Icon name="verified" className="text-base text-gold" />
              Verify pass
            </>
          )}
        </button>
      </div>
    </form>
  );
}
