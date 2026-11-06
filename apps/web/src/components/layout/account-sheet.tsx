"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignOutConfirmation } from "./SignOutConfirmation";
import { accountInitials } from "./nav-items";

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
  /** Kept for callers; the sheet's links no longer depend on the open event. */
  eventId?: string;
  /** Where focus goes when the sheet closes — the icon that opened it. */
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}

interface SheetAction {
  label: string;
  hint: string;
  icon: IconName;
  href: string;
  testId: string;
}

/**
 * The phone's account panel: a sheet that rises over the celebration, holding
 * everything the desktop top bar used to keep in its dropdown. Settings lives
 * here now, so the More sheet stays a list of sections.
 */
export function AccountSheet({
  open,
  onOpenChange,
  userEmail,
  returnFocusTo,
}: AccountSheetProps) {
  const [signOutOpen, setSignOutOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const actions: SheetAction[] = [
    {
      label: "Connect to an AI",
      hint: "Claude, ChatGPT or Gemini",
      icon: "styler",
      href: "/connect-ai",
      testId: "account-connect-ai",
    },
    {
      label: "Settings",
      hint: "Notifications, security & apps",
      icon: "settings",
      href: "/settings",
      testId: "account-settings",
    },
    {
      label: "Profile",
      hint: "Your account",
      icon: "person",
      href: "/profile",
      testId: "account-profile",
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={sheetRef}
          sheet
          className="account-sheet gap-0 outline-none"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            // Hold focus on the panel itself, so no row shows its focus ring
            // for a touch user who has not reached it yet.
            event.preventDefault();
            sheetRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            // There is no Radix trigger, so hand focus back to the icon.
            event.preventDefault();
            returnFocusTo?.current?.focus();
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Account</DialogTitle>
            <DialogDescription>
              Your Àríyá account and where it leads.
            </DialogDescription>
          </DialogHeader>

          <div
            aria-hidden="true"
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-gold-ink/35"
          />

          <div
            className="wiz-rise mb-4 flex items-center gap-3 px-1"
            style={{ "--i": 0 } as React.CSSProperties}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-burgundy font-display text-base font-bold text-champagne ring-1 ring-gold/40">
              {accountInitials(userEmail)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-semibold text-night">
                {userEmail || "Signed in"}
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
                Host
              </span>
            </span>
          </div>

          <ul className="space-y-1.5">
            {actions.map((action, i) => (
              <li
                key={action.label}
                className="wiz-rise"
                style={{ "--i": i + 1 } as React.CSSProperties}
              >
                <Link
                  href={action.href}
                  onClick={() => onOpenChange(false)}
                  data-testid={action.testId}
                  className="group flex min-h-[56px] items-center gap-3 rounded-2xl border border-hairline bg-white/40 px-3 py-2 outline-none backdrop-blur-sm transition-colors hover:border-gold/60 hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-burgundy"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-burgundy/[0.07] text-gold-ink transition-colors group-hover:bg-burgundy group-hover:text-champagne group-focus-visible:bg-burgundy group-focus-visible:text-champagne">
                    <Icon name={action.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-night">
                      {action.label}
                    </span>
                    <span className="block truncate text-xs text-label-2">
                      {action.hint}
                    </span>
                  </span>
                  <Icon
                    name="arrow_forward"
                    size={16}
                    className="shrink-0 text-label-2 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}

            <li
              className="wiz-rise"
              style={{ "--i": actions.length + 1 } as React.CSSProperties}
            >
              <button
                type="button"
                onClick={() => setSignOutOpen(true)}
                data-testid="account-sign-out"
                className="group flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-hairline bg-white/40 px-3 py-2 text-left outline-none backdrop-blur-sm transition-colors hover:border-burgundy/40 hover:bg-burgundy/[0.07] focus-visible:ring-2 focus-visible:ring-burgundy"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-burgundy/[0.07] text-burgundy transition-colors group-hover:bg-burgundy group-hover:text-champagne">
                  <Icon name="logout" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-burgundy">
                    Sign out
                  </span>
                  <span className="block truncate text-xs text-label-2">
                    Your place is saved
                  </span>
                </span>
              </button>
            </li>
          </ul>

          <p
            className="wiz-rise mt-4 px-1 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-label-3"
            style={{ "--i": actions.length + 2 } as React.CSSProperties}
          >
            Àríyá Celebration Desk
          </p>
        </DialogContent>
      </Dialog>

      <SignOutConfirmation
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onStay={() => onOpenChange(false)}
      />
    </>
  );
}
