import Link from "next/link";
import "@/styles/site/product.css";
import { pageMetadata } from "@/lib/site-metadata";
import { InvitationCard } from "@/components/site/fine-card";
import { GuestBoard } from "./guest-board";
import { VendorChecklist } from "./vendor-checklist";

export const metadata = pageMetadata({
  title: "What we do",
  description:
    "How Àríyá by OwambePlan runs invitations, RSVPs, seating and vendors for Nigerian weddings and owambes.",
  path: "/product",
  socialTitle: "What Àríyá does · Àríyá",
  socialDescription:
    "Guest lists, personal invitation links, live RSVPs, seating and a vendor checklist for Nigerian celebrations.",
});

const APP_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Àríyá",
  url: "https://ariya-two.vercel.app/product",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Wedding and event planning for Nigerian couples and planners, with personal invitations, RSVP tracking, seating plans and vendor checklists.",
};

const STEPS = [
  {
    title: "Upload your guest list",
    body: "Import a spreadsheet or paste names and numbers. Missing details and duplicates are flagged before anything is saved.",
  },
  {
    title: "Send personal links",
    body: "Each guest gets their own link by WhatsApp, SMS or email, and a confirmation email when they reply.",
  },
  {
    title: "Seat and check in",
    body: "Confirmed guests fill your seating plan, vendors work from one checklist, and on the day you know exactly who's coming.",
  },
];

export default function ProductPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_LD) }}
      />
      <main id="main">
        <section className="wineband page-hero" aria-labelledby="pTitle">
          <div className="wrap">
            <span className="caps">What Àríyá does</span>
            <h1 id="pTitle">
              The calm behind <em className="foil-text">the party.</em>
            </h1>
            <p>
              Àríyá is OwambePlan&rsquo;s planner for couples and the planners
              who run their day. Your guest list, invitations, replies, seats
              and vendors live in one place instead of fifty group chats.
            </p>
          </div>
        </section>

        <section className="sec" id="invitations" aria-labelledby="iTitle">
          <div className="wrap invite-feature">
            <InvitationCard
              variant="wine"
              guest="Adaeze Okonkwo"
              noCotd
              label="Sample personal invitation for Adaeze Okonkwo"
            />
            <div>
              <div className="sec-head">
                <span className="caps">Invitations and RSVP</span>
                <h2 id="iTitle">
                  Every guest gets their <em>own link.</em>
                </h2>
              </div>
              <ul className="points">
                <li>
                  <b>A personal invitation</b>
                  <span>
                    Their name, your colours of the day, the date and venue.
                    Shared by WhatsApp, SMS or email.
                  </span>
                </li>
                <li>
                  <b>One-tap replies</b>
                  <span>
                    Accept or decline, with a plus-one only when you allow it.
                    No app to install.
                  </span>
                </li>
                <li>
                  <b>A confirmation email</b>
                  <span>
                    Guests get their reply, date, venue and table in writing.
                  </span>
                </li>
              </ul>
              <div className="next">
                <Link className="btn btn-wine" href="/about#invitation">
                  See a guest&rsquo;s invitation
                </Link>
                <Link className="btn btn-ghost" href="/#invitation">
                  Open one on the home page
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="sec linen" id="tools" aria-labelledby="tTitle">
          <div className="wrap">
            <div className="sec-head">
              <span className="caps">Guests and seating</span>
              <h2 id="tTitle">
                Know who&rsquo;s coming. <em>And where they sit.</em>
              </h2>
              <p className="muted">
                Import your list, watch replies arrive, and seat confirmed
                guests on a plan of your hall. A table never takes more people
                than it has chairs.
              </p>
            </div>
            <GuestBoard />
          </div>
        </section>

        <section className="sec" id="vendors" aria-labelledby="vTitle">
          <VendorChecklist />
        </section>

        <section className="sec wineband" id="how" aria-labelledby="hTitle">
          <div className="wrap">
            <div className="sec-head">
              <span className="caps">How it works</span>
              <h2 id="hTitle">
                Three steps from list to <em>last dance.</em>
              </h2>
            </div>
            <ol className="how">
              {STEPS.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p className="muted">{step.body}</p>
                </li>
              ))}
            </ol>
            <div className="next">
              <Link className="btn btn-primary" href="/events">
                Start planning
              </Link>
              <Link className="btn btn-ghost" href="/pricing">
                See pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="sec linen" id="data" aria-labelledby="dTitle">
          <div className="wrap">
            <div className="sec-head">
              <span className="caps">Your data</span>
              <h2 id="dTitle">
                What we use, and <em>why.</em>
              </h2>
            </div>
            <p>
              You can sign in to Àríyá with an email and password or with
              Google. If you choose Google, we receive only your name, email
              address and profile picture, and we use them solely to create and
              recognise your account. We never see your Google password, never
              read your email, contacts or files, and never sell your data.
              Guest details that hosts add are used only to run that
              host&rsquo;s celebration. Read the full{" "}
              <Link href="/privacy">Privacy Policy</Link> and{" "}
              <Link href="/terms">Terms of Service</Link>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
