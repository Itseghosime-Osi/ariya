"use client";

import { useState } from "react";
import { seg, useScene } from "@/components/site/use-scene";
import { FREE_PLAN_LIMIT } from "@/lib/plan";

const MAX = 300;
const FREE = FREE_PLAN_LIMIT;

/**
 * How the price behaves, shown rather than told: the guest list grows as you scroll, and the price
 * is free until the 51st invitation, then one flat amount however far it keeps climbing.
 */
export function PriceScene() {
  const [guests, setGuests] = useState(0);
  const ref = useScene<HTMLElement>((p) => {
    const n = Math.round(seg(p, 0.06, 0.92) * MAX);
    setGuests((g) => (g === n ? g : n));
  });
  const paid = guests > FREE;

  return (
    <section
      ref={ref}
      className="ps-scene ps-scene-short"
      aria-label="How the price works as the guest list grows"
    >
      <div className="ps-sticky">
        <div className="wrap ps-grid">
          <div className="ps-copy">
            <span className="caps">The price of a yes</span>
            <h2>
              One price. <em className="foil-text">Whatever the list.</em>
            </h2>
            <p>
              Up to {FREE} invitations are free. Past that, one Celebration Pass
              covers the whole event, whether the list stops at 120 or keeps
              going. There is no per-guest fee and no subscription.
            </p>
          </div>
          <div className="ps-stage" aria-hidden="true">
            <div className="pr-meter">
              <p className="pr-guests">
                <b>{guests}</b>
                <span>guests invited</span>
              </p>
              <div className="pr-bar">
                <i style={{ width: `${(guests / MAX) * 100}%` }} />
                <span
                  className="pr-tick"
                  style={{ left: `${(FREE / MAX) * 100}%` }}
                >
                  {FREE}
                </span>
              </div>
              <p className={paid ? "pr-price paid" : "pr-price"}>
                <b>{paid ? "₦50,000" : "Free"}</b>
                <span>
                  {paid
                    ? "Celebration Pass · once for the event"
                    : `Up to ${FREE} invitations`}
                </span>
              </p>
              <p className="pr-flat">
                {paid
                  ? `The same ₦50,000 at ${guests} as at ${FREE + 1}.`
                  : `Keep scrolling: nothing changes after the ${FREE + 1}st except the pass.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
