import React from "react";
import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/lib/legal/LegalDocument";
import { LEGAL } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Privacy Policy • Àríyá",
  description:
    "What Àríyá collects about hosts and guests, why, who we share it with, how long we keep it, and your rights.",
};

const mail = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <p>
          {LEGAL.product} is a planning suite for weddings and other
          celebrations. We decide how the personal information described here is
          used to run the service, which makes us the “data controller” for
          hosts’ accounts. For guest details that a host adds, the host decides
          why and how they are used, and we process them on the host’s behalf
          (see section 4).
        </p>
        <p>Questions about this policy: {mail}.</p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <p>
          <strong>Hosts and their team.</strong> Your name, email address and
          password (stored as a one-way hash by our sign-in provider), your role
          (a couple, a planner, or team staff), and the events you create or are
          invited to. If you sign in with Google, we receive your name, email
          address and profile picture from Google. We never see your Google
          password.
        </p>
        <p>
          <strong>Event details a host adds.</strong> The celebration’s title,
          date, venue, schedule, dress code, cover image, invitation designs and
          pictures you upload, the film’s song and photos, checklists, vendors,
          budgets, seating plans and team members.
        </p>
        <p>
          <strong>Guests.</strong> What a host enters or imports: name, phone
          number, email address, party size, side or group, notes, and seating.
          What a guest enters when they reply: whether they are coming, how many
          are attending, a plus-one’s name, dietary needs, a note to the couple,
          and answers to the host’s own questions. When a guest is admitted at
          the door we record that they arrived and when.
        </p>
        <p>
          <strong>Payments.</strong> When a host pays for a celebration, the
          payment is taken by Paystack. We receive and keep the payment
          reference, amount, status and date. We never see or store card
          numbers.
        </p>
        <p>
          <strong>Messages we send.</strong> A record of each email sent through
          the service: who it went to, its subject, whether it was delivered,
          and when.
        </p>
        <p>
          <strong>Devices.</strong> If you switch on app notifications, we store
          the address your browser gives us for sending them. We also keep short
          technical records to protect the service from abuse, such as how often
          a link has been tried.
        </p>
      </>
    ),
  },
  {
    id: "why",
    title: "Why we use it",
    body: (
      <>
        <ul>
          <li>
            To run the service you asked for: your account, your events, your
            guest list, invitations, replies, seating and check-in.
          </li>
          <li>
            To send the messages that go with it: invitation and reminder
            emails, sign-in and password emails, and notifications you switch
            on.
          </li>
          <li>To take and record payments.</li>
          <li>To keep the service secure and to prevent abuse and fraud.</li>
          <li>To meet legal duties, such as keeping payment records.</li>
        </ul>
        <p>
          Under Nigerian data protection law our bases are your agreement to our
          terms (so we can provide the service), our legitimate interest in
          keeping it safe and working, our legal duties, and your consent where
          we ask for it (for example, for notifications). We do not sell
          personal information, and we do not use it for advertising.
        </p>
      </>
    ),
  },
  {
    id: "guests",
    title: "Guest information and the host’s responsibility",
    body: (
      <>
        <p>
          A guest’s details belong to the celebration they were invited to. The
          host who added them decides what is collected and is responsible for
          having a good reason to hold and use it, and for how invitations are
          sent. We process guest details only to provide the service to that
          host.
        </p>
        <p>
          If you are a guest and want to see, correct or remove your details,
          you can ask the host who invited you, or write to us at {mail} and we
          will help. Your personal invitation link is private to you; please do
          not share it.
        </p>
      </>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <p>
          We use a small number of companies to run the service. Each receives
          only what it needs for its job.
        </p>
        <ul>
          <li>
            <strong>Supabase</strong>: our database, sign-in and file storage.
          </li>
          <li>
            <strong>Vercel</strong>: hosting the website and app.
          </li>
          <li>
            <strong>Resend</strong>: sending email on our behalf.
          </li>
          <li>
            <strong>Paystack</strong>: taking payments.
          </li>
          <li>
            <strong>Google</strong>: only if you choose to sign in with Google.
          </li>
          <li>
            <strong>Browser and phone push services</strong> (such as those run
            by Google, Apple and Mozilla): delivering notifications you switched
            on.
          </li>
        </ul>
        <p>
          If a host connects an AI assistant to their account, that assistant
          can read and, where the host allows it, change that host’s event
          information. The host chooses what to connect and can disconnect it at
          any time from the Connect AI page.
        </p>
        <p>
          We may disclose information if the law requires it, or to protect the
          rights and safety of our users and the service. If the business is
          ever sold or merged, information may move to the new owner under the
          same protections.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar storage",
    body: (
      <>
        <p>
          We use cookies that are needed to keep you signed in. We also store
          small preferences in your browser (such as the designer’s mode or a
          dark interface) and remember the page you came from so the Back button
          works. These stay on your device.
        </p>
        <p>
          We do not use advertising cookies or third-party analytics trackers.
          Some public pages load typefaces from Google Fonts, which means your
          browser contacts Google to fetch them.
        </p>
      </>
    ),
  },
  {
    id: "keep",
    title: "How long we keep it",
    body: (
      <>
        <p>
          We keep an account and its events for as long as the account is open.
          Once a celebration’s date has passed, it becomes read-only. When a
          host deletes an event, its guest list, replies, seating, tasks and
          other records are deleted with it. Copies held in routine backups are
          overwritten on the provider’s normal schedule.
        </p>
        <p>
          You can ask us to delete your account at {mail}. We will delete it and
          the events you own, except for what we must keep by law, such as
          payment records.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>
          Under the Nigeria Data Protection Act 2023 you have the right to know
          what we hold about you and to get a copy, to have it corrected, to
          have it deleted where we have no good reason to keep it, to object to
          or limit how we use it, to take it elsewhere in a common format, and
          to withdraw consent you gave. To use any of these, write to {mail}. We
          will answer within a reasonable time and may need to confirm who you
          are first.
        </p>
        <p>
          If you are not happy with our answer you can complain to the Nigeria
          Data Protection Commission.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        Data travels over encrypted connections. Access to each celebration is
        limited to the people the host adds, with different roles seeing
        different things, and guest links are unique to each guest. No system is
        perfectly secure, so please use a strong password and keep it to
        yourself. If we learn of a breach that affects you, we will tell you and
        the regulator as the law requires.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        {LEGAL.product} is for adults. Hosts must be at least 18. A host may
        list a child as part of a guest’s party (for example, a party of four);
        they should add only what is needed to plan the day.
      </p>
    ),
  },
  {
    id: "transfers",
    title: "Where it is processed",
    body: (
      <p>
        Our providers may process information in countries outside Nigeria. When
        they do, we rely on them to protect it to a standard that matches the
        law that applies to us.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change this policy in a way that matters, we will update the date
        above and, for important changes, tell account holders by email or in
        the app before they take effect.
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

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      summary={`This explains what ${LEGAL.product} collects about the hosts who plan celebrations and the guests who are invited to them, why, who helps us run the service, and the choices you have. We have kept it plain on purpose.`}
      sections={sections}
    />
  );
}
