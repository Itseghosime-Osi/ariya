"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { InvitationCard } from "../InvitationCard";
import { dialogTheme } from "./dialog-theme";
import type { InvitationDesign } from "../../types";

interface GuestPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  design: InvitationDesign;
  coupleName: string;
  dark?: boolean;
}

/**
 * "See it as a guest" (L11): the card as it arrives on a guest's phone, apart from the studio's
 * tools, with a plain list of what is yours and what the guest gets. The entry seal is drawn with a
 * sample code, and no guest link or real code is shown anywhere in this dialog.
 */
export function GuestPreviewDialog({
  open,
  onClose,
  design,
  coupleName,
  dark = false,
}: GuestPreviewDialogProps) {
  const t = dialogTheme(dark);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby="guest-preview-desc"
          data-testid="guest-preview"
          className={cn(
            "fixed inset-0 z-(--studio-z-overlay) flex items-center justify-center p-4 backdrop-blur-md",
            t.overlay
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className={cn(
              "relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border p-6 shadow-2xl",
              t.panel
            )}
          >
            <div
              className={cn(
                "flex items-start justify-between border-b pb-4",
                t.divider
              )}
            >
              <div>
                <Dialog.Title
                  className={cn(
                    "font-serif text-2xl font-bold tracking-tight",
                    t.title
                  )}
                >
                  See it as a guest
                </Dialog.Title>
                <p
                  id="guest-preview-desc"
                  className={cn("mt-1 text-xs", t.muted)}
                >
                  The card as it arrives on a guest&apos;s phone, without the
                  studio around it.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close guest preview"
                onClick={onClose}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full transition",
                  t.ghost
                )}
              >
                <span className="text-xl leading-none">✕</span>
              </button>
            </div>

            <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,18rem)_1fr]">
              <div
                data-testid="guest-preview-card"
                className="mx-auto w-full max-w-[18rem] overflow-hidden rounded-2xl shadow-(--studio-shadow-stage)"
              >
                <InvitationCard
                  design={design}
                  coupleName={coupleName}
                  sampleEntry
                />
              </div>

              <div className="space-y-4 text-xs leading-relaxed">
                <section>
                  <h3 className={cn("text-sm font-semibold", t.strong)}>
                    What a guest gets
                  </h3>
                  <ul
                    className={cn("mt-2 list-disc space-y-1.5 pl-5", t.muted)}
                  >
                    <li>This card, with your words, colours and pictures.</li>
                    <li>
                      A personal entry pass of their own, once they accept. It
                      sits in the seal on the card.
                    </li>
                    <li>A button to save the invitation to their phone.</li>
                  </ul>
                </section>
                <section>
                  <h3 className={cn("text-sm font-semibold", t.strong)}>
                    What stays with you
                  </h3>
                  <ul
                    className={cn("mt-2 list-disc space-y-1.5 pl-5", t.muted)}
                  >
                    <li>
                      The studio&apos;s tools, rulers, guides and print guides.
                    </li>
                    <li>Your backups and every earlier edit.</li>
                  </ul>
                </section>
                <p
                  role="note"
                  className={cn("rounded-xl border p-3", t.well, t.muted)}
                >
                  The seal here carries a sample code. No guest link or real
                  entry code is shown in this preview.
                </p>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
