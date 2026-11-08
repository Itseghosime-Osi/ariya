import Link from "next/link";
import "@/styles/site/pricing.css";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Pricing",
  description: "Àríyá pricing: pay per event, no subscription.",
  path: "/pricing",
  socialTitle: "Pricing · Àríyá",
  socialDescription:
    "Pay per event. Free for up to 20 guest invitations. Celebration Pass: ₦50,000.",
});

const FAQ = [
  {
    q: "Do guests need an app?",
    a: "No. Each guest opens their personal link in any phone browser and replies in a tap.",
  },
  {
    q: "Can planners use it for several clients?",
    a: "Yes. Planners use the same Celebration Pass, charged per client event, so you only pay for the events you run.",
  },
  {
    q: "What happens when a table is full?",
    a: "Àríyá won't seat more people than a table has chairs, and shows how many seats are left before you assign anyone.",
  },
  {
    q: "Is it ready to use today?",
    a: "You can create an account and plan your event. The examples on our public pages use sample data; your dashboard uses your own events. Check the payment mode shown at checkout before paying.",
  },
];

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }}
      />
      <main id="main">
        <section className="wineband page-hero" aria-labelledby="pTitle">
          <div className="wrap">
            <span className="caps">Pricing</span>
            <h1 id="pTitle">
              Pay per event. <em className="foil-text">No subscription.</em>
            </h1>
            <p>
              Couples pay once for their celebration. Planners pay for each
              client event they run, and can include it in their own fee.
            </p>
          </div>
        </section>

        <section className="sec" aria-label="Plans">
          <div className="wrap">
            <p style={{ marginBottom: 20 }}>
              <span className="demo-flag">One Celebration Pass per event</span>
            </p>
            <div className="price-rows">
              <div className="price-row">
                <h3>
                  Intimate<small>Up to 20 guest invitations</small>
                </h3>
                <p className="muted">
                  Personal invitations and RSVP links, a live headcount and
                  confirmation emails.
                </p>
                <div className="amt">Free</div>
              </div>
              <div className="price-row pick">
                <h3>
                  Celebration
                  <small
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.875rem",
                      color: "var(--ink-soft)",
                    }}
                  >
                    Unlimited invitations · for couples
                  </small>
                </h3>
                <p className="muted">
                  Unlimited guest invitations and reminders, plus guest-list
                  import, seating plans and vendor checklists.
                </p>
                <div className="amt">
                  ₦50,000<small>per event</small>
                </div>
              </div>
              <div className="price-row">
                <h3>
                  Planner<small>For planners running client events</small>
                </h3>
                <p className="muted">
                  The same Celebration Pass for each client event, with team
                  access for planners and ushers.
                </p>
                <div className="amt">
                  ₦50,000<small>per client event</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec linen" aria-labelledby="fTitle">
          <div className="wrap">
            <div className="sec-head">
              <span className="caps">Questions</span>
              <h2 id="fTitle">
                Before you <em>start.</em>
              </h2>
            </div>
            <div className="faq">
              {FAQ.map(({ q, a }) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="sec wineband close-band" aria-labelledby="cTitle">
          <div className="wrap">
            <h2 id="cTitle">
              Start with your <em className="foil-text">guest list.</em>
            </h2>
            <div className="next">
              <Link className="btn btn-primary" href="/events">
                Start planning
              </Link>
              <Link className="btn btn-ghost" href="/product">
                What Àríyá does
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
