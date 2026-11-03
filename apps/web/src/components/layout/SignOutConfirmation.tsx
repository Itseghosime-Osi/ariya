"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { signOutAction } from "@/features/auth/actions";

type SignOutMood = "neutral" | "stay" | "leave";

interface SignOutConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutConfirmation({
  open,
  onOpenChange,
}: SignOutConfirmationProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mood, setMood] = useState<SignOutMood>("neutral");
  const [showStayToast, setShowStayToast] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    if (!showStayToast) return;
    const timeout = window.setTimeout(() => setShowStayToast(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [showStayToast]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) {
      setMood("neutral");
      if (nextOpen) setShowStayToast(false);
      else setErrorMessage(null);
      onOpenChange(nextOpen);
    }
  };

  const handleStaySignedIn = () => {
    setMood("stay");
    setShowStayToast(true);
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    setErrorMessage(null);
    setMood("leave");
    setIsPending(true);
    try {
      const result = await signOutAction();
      if (!result.ok) {
        setErrorMessage(result.error);
        setMood("neutral");
        return;
      }

      await new Promise<void>((resolve) => window.setTimeout(resolve, 550));
      onOpenChange(false);
      router.replace("/sign-in");
    } catch (error) {
      console.error("Sign out failed.", error);
      setErrorMessage("We couldn't sign you out. Please try again.");
      setMood("neutral");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            titleRef.current?.focus();
          }}
          className="max-w-sm overflow-hidden rounded-[28px] border border-[#e9c98a]/30 bg-[#1c070d] p-6 text-ivory shadow-[0_28px_90px_-28px_rgba(28,7,13,0.9)] [&>button:last-child]:z-20 [&>button:last-child]:text-ivory/65 [&>button:last-child]:hover:bg-ivory/10 [&>button:last-child]:focus:ring-gold"
        >
          <div
            aria-hidden="true"
            className="weave pointer-events-none absolute inset-0 opacity-[0.045]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-[#e9c98a]/80 to-transparent"
          />
          <div className="relative z-10 space-y-5">
            <DialogHeader className="items-center gap-2 text-center">
              <span
                aria-hidden="true"
                className={`grid h-14 w-14 place-items-center rounded-full border border-[#e9c98a]/30 bg-[#e9c98a]/10 text-3xl motion-safe:transition-transform motion-safe:duration-300 ${
                  mood === "stay"
                    ? "motion-safe:scale-110 motion-safe:animate-bounce"
                    : mood === "leave"
                      ? "motion-safe:rotate-[-12deg]"
                      : ""
                }`}
              >
                {mood === "stay" ? "🥳" : mood === "leave" ? "🥺" : "🎉"}
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e9c98a]">
                Àríyá Celebration Desk
              </p>
              <DialogTitle
                ref={titleRef}
                tabIndex={-1}
                className="font-display text-2xl text-ivory focus:outline-none"
              >
                Sign out of Àríyá?
              </DialogTitle>
              <DialogDescription
                className="max-w-xs text-ivory/70"
                data-testid="sign-out-mood"
                aria-live="polite"
                aria-atomic="true"
              >
                {mood === "stay"
                  ? "Hooray! The celebration continues."
                  : mood === "leave"
                    ? "We'll save your place for next time."
                    : "Your celebration details will be here when you return."}
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <p
                className="flex items-start gap-2 rounded-xl border border-[#f57c8a]/25 bg-[#c1283d]/15 px-3 py-2 text-sm text-[#ffd4d8]"
                role="alert"
              >
                <Icon name="error" size={17} className="mt-0.5 shrink-0" />
                {errorMessage}
              </p>
            )}

            <DialogFooter className="gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onPointerEnter={() => setMood("stay")}
                onFocus={() => setMood("stay")}
                onClick={handleStaySignedIn}
                disabled={isPending}
                className="border-[#e9c98a]/35 bg-transparent text-ivory hover:bg-ivory/10 hover:text-ivory focus-visible:ring-gold"
              >
                Stay signed in
              </Button>
              <Button
                type="button"
                data-testid="confirm-sign-out"
                onPointerEnter={() => setMood("leave")}
                onFocus={() => setMood("leave")}
                onClick={handleConfirm}
                disabled={isPending}
                className="bg-[#e9c98a] text-[#1c070d] hover:bg-[#f6dca8] focus-visible:ring-gold"
              >
                {isPending ? "Signing out..." : "Sign out"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {showStayToast && (
        <div
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#e9c98a]/35 bg-[#1c070d] px-4 py-3 text-sm text-ivory shadow-[0_18px_48px_-20px_rgba(28,7,13,0.9)]"
          role="status"
          data-testid="sign-out-stay-toast"
        >
          <span
            aria-hidden="true"
            className="text-xl motion-safe:animate-bounce"
          >
            🥳
          </span>
          Hooray! The celebration continues.
        </div>
      )}
    </>
  );
}
