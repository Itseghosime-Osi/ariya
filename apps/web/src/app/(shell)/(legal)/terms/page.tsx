import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, type LegalSection } from "@/lib/legal/LegalDocument";
import { LEGAL } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Terms of Service • Àríyá",
  description:
    "The rules for using Àríyá: accounts, guest information, your content, payments, and what we each can expect.",
};

const mail = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Our agreement",
    body: (
      <p>
        These terms are between you and the team behind {LEGAL.product}. By
        creating an account, signing in, or using the service, you agree to them
        and to our <Link href="/privacy">Privacy Policy</Link>. If you do not
        agree, please do not use the service.
      </p>
    ),
  },
  {
    id: "service",
    title: "What the service is",
    body: (
      <p>
        {LEGAL.product} helps you plan a celebration: a guest list, invitations
        and replies, seating, checklists, vendors, a run sheet, check-in at the
        door, and a page and film for your guests. We keep improving it, so
        features may change.
      </p>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <ul>
        <li>You must be at least 18 and able to enter a binding agreement.</li>
        <li>Give accurate details and keep them up to date.</li>
        <li>
          Keep your password, and your Google account if you use it to sign in,
          secure. You are responsible for what happens under your account. Tell
          us at {mail} if you think someone else has got in.
        </li>
        <li>
          People you add to an event’s team can see and change what their role
          allows. Add only people you trust.
        </li>
      </ul>
    ),
  },
  {
    id: "guests",
    title: "Guest information",
    body: (
      <>
        <p>
          When you add or import guests, you are responsible for having the
          right to hold and use their details, and for telling them how they
          will be used. Add only what you need to plan the day.
        </p>
        <p>
          You may contact guests about the celebration they are invited to. You
          must not use guest details for anything else, and you must not send
          unwanted or misleading messages through the service.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <>
        <p>
          What you put into {LEGAL.product} (your event details, guest list,
          designs, pictures, songs and words) stays yours. You give us
          permission to store, display and process it only so we can run the
          service for you and your guests, including showing your invitation,
          page and film to the people you share them with.
        </p>
        <p>
          You promise you have the right to use everything you upload, including
          imported invitation cards, photographs and music, and that it does not
          break the law or anyone’s rights. The film’s song is yours to choose;
          you are responsible for having the rights to it.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "Using it properly",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>
            break the law, or use the service for anything unlawful, harassing,
            hateful or fraudulent;
          </li>
          <li>
            upload malware, or try to get into accounts, data or systems that
            are not yours;
          </li>
          <li>
            overload, scrape, reverse-engineer or interfere with the service;
          </li>
          <li>
            use it to send spam, or to collect information about people without
            their knowledge;
          </li>
          <li>
            resell or share your access to the service without our permission.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "messages",
    title: "Invitations and messages",
    body: (
      <p>
        When you send invitations by email, we send them from our address on
        your behalf, and you are the sender in the eyes of the law. Text and
        WhatsApp messages open on your own phone with the message ready: you
        choose to send them and they come from your number. You are responsible
        for who you message and what you write.
      </p>
    ),
  },
  {
    id: "payments",
    title: "Payments",
    body: (
      <p>
        Some features are paid for. The price is shown before you pay, in naira,
        and payments are processed by Paystack under its own terms. You are
        responsible for any taxes that apply to you. If a payment fails, the
        paid features may not be switched on. Unless the law says otherwise or
        we say so when you buy, payments are for a celebration and are not
        refundable once its features have been used. If you think a charge is
        wrong, write to {mail} and we will look into it.
      </p>
    ),
  },
  {
    id: "ai",
    title: "Connected AI apps",
    body: (
      <p>
        You can connect an AI assistant to your account. When you do, you allow
        it to read, and where you permit it, change your event information. You
        are responsible for what you connect and what it does on your
        instruction. You can disconnect it at any time from the Connect AI page.
        We do not control how a connected assistant works, so check what it does
        with your information.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and when an event ends",
    body: (
      <p>
        We work to keep {LEGAL.product} available, but we cannot promise it will
        never be interrupted or free of errors. Once a celebration’s date has
        passed, its pages and records become read-only. Please keep your own
        copy of anything you cannot afford to lose, such as a final guest list.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Ending your use",
    body: (
      <p>
        You can stop using the service at any time, and ask us to delete your
        account at {mail}. We may suspend or close an account that breaks these
        terms, puts others at risk, or is used unlawfully, and we will tell you
        why where we can. Sections that by their nature should continue (such as
        ownership, limits on our liability and the law that applies) do so after
        an account ends.
      </p>
    ),
  },
  {
    id: "warranty",
    title: "No guarantees beyond the law",
    body: (
      <p>
        The service is provided “as is” and “as available”. Planning
        suggestions, seating arrangements, risk notes and anything produced by
        an AI assistant are aids to your own judgement, not professional advice.
        Check them against your venue, caterer and guests before you rely on
        them.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Our liability",
    body: (
      <>
        <p>
          We are not liable for losses we could not reasonably have foreseen, or
          for lost profits, lost opportunities or indirect losses. Our total
          liability to you for anything connected with the service is limited to
          what you paid us in the twelve months before the claim.
        </p>
        <p>
          Nothing in these terms limits liability that cannot be limited by law,
          including for death or personal injury caused by negligence, or for
          fraud.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "The law that applies",
    body: (
      <p>
        These terms are read under {LEGAL.law}. If a disagreement comes up,
        please write to us first at {mail} and we will try to settle it fairly.
        If we cannot, the courts of Nigeria can decide it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms. For changes that matter, we will update the
        date above and tell account holders by email or in the app before they
        take effect. If you keep using the service after that, you accept the
        new terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        {LEGAL.operator}, operating {LEGAL.product} at {LEGAL.site}. Email:{" "}
        {mail}.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      summary={`These are the rules for using ${LEGAL.product}. They are short, they are meant to be read, and they cover your account, your guests’ information, what you put in, payments, and what you can expect from us.`}
      sections={sections}
    />
  );
}
