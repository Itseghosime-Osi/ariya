"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import { updateProfileAction } from "../actions";

const FIELD =
  "min-h-[48px] w-full rounded-2xl border border-hairline bg-white/45 px-4 text-[15px] text-night outline-none transition-colors placeholder:text-label-3 focus:border-burgundy focus:ring-2 focus:ring-burgundy/20";

/** The pencil on the profile card: edits the host's name and phone number. */
export function EditProfileButton({
  name,
  phone,
}: {
  name: string;
  phone: string | null;
}) {
  const router = useRouter();
  const phoneSize = useIsMobile();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(name);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFullName(name);
          setPhoneValue(phone ?? "");
          setError(null);
          setOpen(true);
        }}
        aria-label="Edit profile"
        data-testid="profile-edit"
        className="grid h-11 w-11 place-items-center rounded-full border border-hairline bg-white/45 text-burgundy shadow-sm transition-all hover:scale-105 hover:border-gold-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <Icon name="edit" size={17} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          sheet={phoneSize}
          className={cn(!phoneSize && "rounded-[28px] p-7")}
        >
          {phoneSize && (
            <div
              aria-hidden="true"
              className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-gold-ink/35"
            />
          )}
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-night">
              Edit profile
            </DialogTitle>
            <DialogDescription className="text-sm text-label-2">
              How you appear to your team and co-planners.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const res = await updateProfileAction({
                  fullName,
                  phone: phoneValue,
                });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              });
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
                Full name
              </span>
              <input
                className={FIELD}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                disabled={pending}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
                Phone
              </span>
              <input
                className={FIELD}
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                placeholder="0803 123 4567"
                disabled={pending}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="min-h-[48px] w-full rounded-2xl bg-burgundy text-sm font-semibold text-champagne shadow-[0_12px_30px_-14px_rgba(74,15,28,0.9)] disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
