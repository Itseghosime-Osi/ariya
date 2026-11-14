"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AdminResult } from "../actions";

/**
 * One admin action: a button that opens a small form asking why (the answer goes in the admin log)
 * and, for anything that cannot be undone, asks to type a name or reference to confirm.
 */
export function AdminAction({
  label,
  description,
  danger = false,
  confirmPrompt,
  confirmValue,
  needsReason = true,
  redirectTo,
  run,
}: {
  label: string;
  description: string;
  danger?: boolean;
  /** For irreversible actions: what to type, e.g. "Type the celebration's name". */
  confirmPrompt?: string;
  confirmValue?: string;
  needsReason?: boolean;
  /** After success, go here (the thing acted on is gone) and show the message there. */
  redirectTo?: string;
  run: (reason: string, typed: string) => Promise<AdminResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const uid = useId();

  const ready =
    (!needsReason || reason.trim().length >= 3) &&
    (!confirmValue || typed.trim() === confirmValue.trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    start(async () => {
      const res = await run(reason, typed);
      setResult(res);
      if (res.ok && redirectTo) {
        router.replace(
          `${redirectTo}?notice=${encodeURIComponent(res.message)}`
        );
        return;
      }
      if (res.ok) {
        setOpen(false);
        setReason("");
        setTyped("");
        router.refresh();
      }
    });
  };

  return (
    <div
      className={
        danger
          ? "rounded-2xl border border-error/30 bg-error/[0.04] p-4"
          : "rounded-2xl border border-hairline bg-white/60 p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-prose">
          <p className="font-semibold text-night">{label}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-label-2">
            {description}
          </p>
        </div>
        {!open && (
          <Button
            type="button"
            size="sm"
            variant={danger ? "destructive" : "outline"}
            onClick={() => {
              setOpen(true);
              setResult(null);
            }}
          >
            {label}
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
          {needsReason && (
            <>
              <label
                htmlFor={`${uid}-reason`}
                className="text-xs font-semibold text-night"
              >
                Why? (goes in the admin log)
              </label>
              <textarea
                id={`${uid}-reason`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={500}
                className="rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-burgundy"
              />
            </>
          )}
          {confirmValue && (
            <>
              <label
                htmlFor={`${uid}-confirm`}
                className="text-xs font-semibold text-night"
              >
                {confirmPrompt ?? "Type to confirm"}:{" "}
                <span className="font-mono">{confirmValue}</span>
              </label>
              <input
                id={`${uid}-confirm`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="min-h-10 rounded-xl border border-outline-variant bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-burgundy"
              />
            </>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              variant={danger ? "destructive" : "primary"}
              disabled={!ready || pending}
            >
              {pending ? "Working…" : `Confirm: ${label.toLowerCase()}`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          className={
            result.ok
              ? "mt-3 text-sm font-semibold text-[#1e6b45]"
              : "mt-3 text-sm font-semibold text-error"
          }
        >
          {result.ok ? result.message : result.error}
        </p>
      )}
    </div>
  );
}
