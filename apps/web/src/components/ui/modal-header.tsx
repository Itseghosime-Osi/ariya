import * as React from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The wine-and-gold head of a form dialog: a gold icon tile, a small gold eyebrow, the title in the
 * display face and one line of what the dialog does. Sits flush at the top of `DialogContent p-0`.
 */
export function ModalHeader({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: IconName;
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <DialogHeader className="profile-card relative gap-0 overflow-hidden rounded-none px-5 pb-4 pt-5 text-left sm:px-7">
      <span aria-hidden="true" className="profile-card__weave" />
      <div className="relative flex items-center gap-3.5 pr-8">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] text-night shadow-[0_6px_14px_-6px_rgba(0,0,0,0.6)]">
          <Icon name={icon} size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
            {eyebrow}
          </p>
          <DialogTitle className="font-display text-[1.45rem] font-semibold leading-tight text-[#fff6dc] sm:text-2xl">
            {title}
          </DialogTitle>
        </div>
      </div>
      <DialogDescription className="relative mt-2 text-[13px] leading-snug text-champagne/70">
        {description}
      </DialogDescription>
      {children && <div className="relative">{children}</div>}
    </DialogHeader>
  );
}

/** Class for a `DialogContent` that carries a `ModalHeader`: ivory body, light close button. */
export const FORM_DIALOG =
  "max-h-[92dvh] gap-0 overflow-y-auto border border-gold/30 bg-ivory p-0 [&>button]:text-champagne [&>button]:opacity-80 [&>button:hover]:bg-white/10 [&>button:hover]:opacity-100";
