import Link from "next/link";
import { FREE_PLAN_LIMIT } from "@/lib/plan";

/**
 * "Planned with Àríyá": the quiet line under every guest page (invitation, RSVP, public page). It is
 * how guests discover Àríyá, so it shows for every celebration, paid or free. It is never drawn on
 * the designed invitation card itself.
 */
export function GuestMark() {
  return (
    <footer
      data-testid="guest-mark"
      className="mx-auto max-w-3xl px-4 pb-10 pt-6 text-center text-xs text-label-2"
    >
      <span className="font-display italic">Planned with Àríyá</span>
      <span aria-hidden="true"> · </span>
      <Link
        href="/"
        prefetch={false}
        className="font-semibold text-burgundy underline-offset-4 hover:underline"
      >
        Plan your own celebration
        <span aria-hidden="true"> →</span>
      </Link>
    </footer>
  );
}

/** Shown to a guest right after they reply: the moment they are most likely to be planning one too. */
export function PlanYourOwn() {
  return (
    <p
      data-testid="plan-your-own"
      className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-center text-sm text-night"
    >
      Planning a celebration of your own?{" "}
      <Link
        href="/sign-up"
        className="font-semibold text-burgundy underline-offset-4 hover:underline"
      >
        Àríyá is free up to {FREE_PLAN_LIMIT} guests
        <span aria-hidden="true"> →</span>
      </Link>
    </p>
  );
}
