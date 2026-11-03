"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { InvitationCard } from "@/components/site/fine-card";

const CARDS = [
  {
    variant: "coral" as const,
    a: "Ejiro",
    b: "Osaze",
    initials: "E O",
    date: "Saturday, 6 March 2027",
    venue: ["Uyi Grand Hall", "Benin City"],
    cotd: [
      ["#a3402a", "Coral"],
      ["#5a1428", "Burgundy"],
      ["#f3ead8", "Ivory"],
    ] as const,
    label: "Sample invitation in coral: Ejiro and Osaze",
  },
  {
    variant: "wine" as const,
    a: "Chidinma",
    b: "Tunde",
    aSub: "Okeke",
    bSub: "Ajayi",
    label: "Sample invitation in burgundy: Chidinma and Tunde",
  },
  {
    variant: "ruby" as const,
    a: "Amaka",
    b: "Seyi",
    initials: "A S",
    date: "Saturday, 17 April 2027",
    venue: ["Transcorp Ballroom", "Abuja"],
    cotd: [
      ["#96182e", "Ruby"],
      ["#c9a256", "Gold"],
      ["#f3ead8", "Ivory"],
    ] as const,
    label: "Sample invitation in ruby: Amaka and Seyi",
  },
];

export function Fan() {
  const fanRef = useRef<HTMLDivElement | null>(null);

  // The cards lift on tap or Enter, one at a time, as the original did.
  useEffect(() => {
    const fan = fanRef.current;
    if (!fan) return;
    const cards = Array.from(fan.querySelectorAll<HTMLElement>(".fc"));
    const cleanups: Array<() => void> = [];

    for (const card of cards) {
      card.tabIndex = 0;
      const toggle = () => {
        const on = !card.classList.contains("lift");
        for (const other of cards) other.classList.remove("lift");
        if (on) card.classList.add("lift");
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      };
      card.addEventListener("click", toggle);
      card.addEventListener("keydown", onKey);
      cleanups.push(() => {
        card.removeEventListener("click", toggle);
        card.removeEventListener("keydown", onKey);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <section className="c-fan" id="invitations" aria-labelledby="fanTitle">
      <div className="fan-head reveal wrap">
        <span className="caps">Your colours, your names</span>
        <h2 id="fanTitle">
          Invitations as fine <em className="foil-text">as the day.</em>
        </h2>
      </div>
      <div className="fan" ref={fanRef}>
        {CARDS.map((card) => (
          <InvitationCard
            key={card.label}
            variant={card.variant}
            a={card.a}
            b={card.b}
            aSub={card.aSub}
            bSub={card.bSub}
            initials={card.initials}
            date={card.date}
            venue={card.venue}
            cotd={card.cotd}
            label={card.label}
          />
        ))}
      </div>
      <p className="fan-foot">
        <Link href="/product">See everything Àríyá does →</Link>
      </p>
    </section>
  );
}
