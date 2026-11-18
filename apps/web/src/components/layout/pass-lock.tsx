import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  PASS_FEATURES,
  PASS_FEATURE_ORDER,
  billingHref,
  type PassFeature,
} from "@/lib/pass";

/**
 * Shown in place of a feature that comes with the Celebration Pass, when this celebration has not
 * got it yet: what the feature does, everything else the pass brings, and one way to unlock it.
 */
export function PassLock({
  eventId,
  feature,
  canPay = true,
  className,
  compact = false,
}: {
  eventId: string;
  feature: PassFeature;
  /** Only an owner can buy the pass; everyone else is told who can. */
  canPay?: boolean;
  className?: string;
  /** A short inline card (inside a page) rather than the full-page version. */
  compact?: boolean;
}) {
  const f = PASS_FEATURES[feature];
  const others = PASS_FEATURE_ORDER.filter((k) => k !== feature);
  return (
    <section
      data-testid={`pass-lock-${feature}`}
      aria-labelledby={`pass-lock-${feature}-title`}
      className={cn(
        "rounded-[24px] border border-gold/40 bg-[linear-gradient(160deg,rgba(233,201,138,0.18),rgba(255,255,255,0.35))] text-left",
        compact ? "p-5" : "p-6 sm:p-8",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-wine text-gold"
          aria-hidden="true"
        >
          <Icon name="lock" size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            Celebration Pass
          </p>
          <h2
            id={`pass-lock-${feature}-title`}
            className="mt-1 font-display text-xl font-semibold text-night sm:text-2xl"
          >
            {f.title}
          </h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-label-2">
            {f.why}
          </p>
        </div>
      </div>

      {!compact && (
        <ul className="mt-5 grid gap-x-6 gap-y-2 text-[13px] text-night sm:grid-cols-2">
          {others.map((k) => (
            <li key={k} className="flex items-start gap-2">
              <Icon
                name="check"
                size={15}
                className="mt-0.5 shrink-0 text-rsvp-accepted"
              />
              {PASS_FEATURES[k].title}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {canPay ? (
          <Link
            href={billingHref(eventId)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-wine px-5 text-sm font-semibold text-ivory transition-colors hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Unlock with the Celebration Pass
            <Icon name="arrow_forward" size={16} />
          </Link>
        ) : (
          <p className="text-sm text-label-2">
            Ask the celebration&rsquo;s owner to get the Celebration Pass.
          </p>
        )}
        <span className="text-xs text-label-2">
          One payment for this celebration. Everything you have already added
          stays.
        </span>
      </div>
    </section>
  );
}
