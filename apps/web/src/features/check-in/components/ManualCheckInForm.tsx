"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";

interface ManualCheckInFormProps {
  loading: boolean;
  onCheckIn: (code: string, count: number) => Promise<void>;
}

export function ManualCheckInForm({
  loading,
  onCheckIn,
}: ManualCheckInFormProps) {
  const [code, setCode] = useState("");
  const [count, setCount] = useState("1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    const admitCount = Math.max(1, parseInt(count, 10) || 1);
    await onCheckIn(cleanCode, admitCount);
    setCode("");
    setCount("1");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs space-y-4"
    >
      <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-3">
        <Icon name="edit" className="text-wine text-base" />
        <h3 className="font-serif text-base font-bold text-wine">
          Manual Code &amp; Pass Lookup
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
        <div className="sm:col-span-8">
          <label className="block font-semibold text-wine mb-1">
            Personal Entry Code / Pass Token
          </label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ARY-7K2M-99NP"
            className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 focus:border-wine font-mono text-sm tracking-wider uppercase outline-hidden"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block font-semibold text-wine mb-1">
            Attendees to Admit
          </label>
          <div className="flex items-center gap-2">
            <select
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden bg-white text-sm font-semibold"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? "Person" : "Persons"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
          <Icon name="info" className="text-xs text-wine/60" />
          <span>Press Enter to instantly admit</span>
        </span>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-5 py-2.5 rounded-xl bg-wine text-ivory font-semibold text-xs hover:bg-wine/90 disabled:opacity-50 flex items-center gap-2 transition-all shadow-xs"
        >
          {loading ? (
            <span>Admitting...</span>
          ) : (
            <>
              <Icon name="check_circle" className="text-sm text-gold" />
              <span>Admit Guest</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
