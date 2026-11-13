import Link from "next/link";
import "@/styles/site/product.css";
import { siteUrl } from "@/lib/site-url";
import { pageMetadata } from "@/lib/site-metadata";
import "@/styles/site/story.css";
import { ChapterMark } from "@/components/site/chapter-mark";
import { StorySpine } from "@/components/site/story-spine";
import { PRODUCT_CHAPTERS } from "./chapters";
import {
  CardScene,
  HelperScene,
  RepliesScene,
  SeatsScene,
  SendScene,
} from "./scenes";
import { ProductEngines } from "./product-engines";
import { GuestBoard } from "./guest-board";
import { VendorChecklist } from "./vendor-checklist";

export const metadata = pageMetadata({
  title: "What we do",
  description:
    "How Àríyá runs invitations, RSVPs, seating and vendors for Nigerian weddings and owambes.",
  path: "/product",
  socialTitle: "What Àríyá does · Àríyá",
  socialDescription:
    "Guest lists, personal invitation links, live RSVPs, seating and a vendor checklist for Nigerian celebrations.",
});

const APP_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Àríyá",
  url: siteUrl("/product"),
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
    body: "Email goes out in bulk with each guest's own link; for WhatsApp or text, copy the link into the chat. Guests get a confirmation email when they reply.",
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
      <ProductEngines />
      <main id="main" className="story-page">
        <StorySpine chapters={PRODUCT_CHAPTERS} mode="steps" />
        <section className="wineband page-hero" aria-labelledby="pTitle">
          <div className="wrap">
            <span className="caps">What Àríyá does</span>
            <h1 id="pTitle">
              The calm behind <em className="foil-text">the party.</em>
            </h1>
            <p>
              Àríyá is a planner for couples and the planners who run their day.
              Your guest list, invitations, replies, seats and vendors live in
              one place instead of fifty group chats. Scroll to follow one
              wedding through it.
            </p>
          </div>
        </section>

        <div id={PRODUCT_CHAPTERS[0].id}>
          <ChapterMark chapter={PRODUCT_CHAPTERS[0]} />
          <section className="sec linen" id="tools" aria-labelledby="tTitle">
            <div className="wrap">
              <div className="sec-head">
                <span className="caps">Guests</span>
                <h2 id="tTitle">
                  Know who&rsquo;s coming. <em>Start with the list.</em>
                </h2>
                <p className="muted">
                  Type guests in, import a spreadsheet, or pick people from your
                  phone&rsquo;s contacts. Missing numbers and duplicates are
                  flagged before anything is saved. Try the sample below.
                </p>
              </div>
              <GuestBoard />
            </div>
          </section>
        </div>

        <div id={PRODUCT_CHAPTERS[1].id}>
          <ChapterMark chapter={PRODUCT_CHAPTERS[1]} />
          <CardScene />
        </div>

        <div id={PRODUCT_CHAPTERS[2].id}>
          <ChapterMark chapter={PRODUCT_CHAPTERS[2]} />
          <SendScene />
        </div>

        <div id={PRODUCT_CHAPTERS[3].id}>
          <ChapterMark chapter={PRODUCT_CHAPTERS[3]} />
          <RepliesScene />
        </div>

        <div id={PRODUCT_CHAPTERS[4].id}>
          <ChapterMark chapter={PRODUCT_CHAPTERS[4]} />
          <SeatsScene />
        </div>

        <div id={PRODUCT_CHAPTERS[5].id}>
          <ChapterMark chapter={PRODUCT_CHAPTERS[5]} />
          <section className="sec" id="vendors" aria-labelledby="vTitle">
            <VendorChecklist />
          </section>
          <div className="wrap ps-door-link">
            <p>
              On the day, a reception desk scans each guest&rsquo;s seal, shows
              who it is and where they sit, and admits them with one tap.{" "}
              <Link href="/about#chapter-door">Watch the door scene</Link>.
            </p>
          </div>
        </div>

        <div id={PRODUCT_CHAPTERS[6].id}>
          <ChapterMark chapter={PRODUCT_CHAPTERS[6]} />
          <HelperScene />
        </div>

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
