import { renderBrandEmail } from "./brand";

/**
 * Every email Àríyá sends, in its one design (lib/email/brand.ts). Each builder is pure and returns
 * the subject, the HTML and a plain-text copy, so the words can be tested without sending anything.
 * The guest invitation itself lives in features/invitations/email.ts and shares the same look.
 */

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

function firstName(name?: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

const seats = (n: number, word = "seat") =>
  `${n} ${n === 1 ? word : `${word}s`}`;

// ---------------------------------------------------------------- the host's own account

export function welcomeEmail(input: {
  name?: string | null;
  email: string;
  siteUrl: string;
}): BuiltEmail {
  const site = input.siteUrl.replace(/\/$/, "");
  const first = firstName(input.name);
  return {
    subject: first ? `Welcome to Àríyá, ${first} ✦` : "Welcome to Àríyá ✦",
    ...renderBrandEmail({
      siteUrl: site,
      preview: `Your account is ready${first ? `, ${first}` : ""}. Here’s how to start your first celebration.`,
      kicker: "Welcome to Àríyá",
      headline: ["Every great", { em: "owambe" }, "starts here."],
      greeting: first ? `Hello ${first},` : "Hello,",
      paragraphs: [
        "Your account is ready, and we’re so glad you’re here. Àríyá keeps the whole celebration in one beautiful place: the guest list, the invitations, the seating, the replies and the day itself.",
        "Here’s how to begin, at your own pace.",
      ],
      rows: [
        {
          label: "Name the day",
          value:
            "Create your celebration: the couple, the date, the venue. It takes about a minute.",
        },
        {
          label: "Design your invitation",
          value:
            "Start from a gold-foil template in the studio and make it yours, or let your own AI design it with you.",
        },
        {
          label: "Invite & seat your guests",
          value:
            "Add your guest list, send personal invitations, watch the replies arrive and place everyone in the hall.",
        },
      ],
      cta: {
        title: "Your first celebration is waiting.",
        note: "Free for up to 50 guest invitations. No card needed.",
        label: "Start my first celebration",
        url: `${site}/events/new`,
        secondary: {
          label: "read the short guide first",
          url: `${site}/documentation`,
        },
      },
      reason: `You’re receiving this because you just made an Àríyá account with ${input.email}. Questions? Simply reply to this email.`,
    }),
  };
}

export function authLinkEmail(input: {
  kind: "confirm" | "reset";
  name?: string | null;
  email: string;
  url: string;
  siteUrl: string;
}): BuiltEmail {
  const first = firstName(input.name);
  const confirm = input.kind === "confirm";
  return {
    subject: confirm
      ? "Confirm your email for Àríyá"
      : "Reset your Àríyá passcode",
    ...renderBrandEmail({
      siteUrl: input.siteUrl,
      preview: confirm
        ? "One tap and your Àríyá account is ready."
        : "Choose a new passcode for your Àríyá account.",
      kicker: confirm ? "One last step" : "Passcode security",
      headline: confirm
        ? ["Confirm", { em: "your email." }]
        : ["A fresh", { em: "passcode." }],
      greeting: first ? `Hello ${first},` : "Hello,",
      paragraphs: confirm
        ? [
            "Thank you for joining Àríyá. Confirm your email address and you’re in: your celebrations, guest lists and seating plans will be waiting.",
          ]
        : [
            "We received a request to reset the passcode on your Àríyá account. Choose a new one with the button below.",
          ],
      cta: {
        title: confirm ? "You’re one tap away." : "Choose your new passcode.",
        label: confirm ? "Confirm my email" : "Choose a new passcode",
        url: input.url,
        finePrint: confirm
          ? "This link works once and expires in 24 hours. If you did not create an Àríyá account, you can ignore this email."
          : "This link works once and expires in 24 hours. If you did not ask for this, ignore this email and your passcode stays the same.",
      },
      showFallbackLink: true,
      reason: `Sent to ${input.email} for your Àríyá account.`,
    }),
  };
}

// ---------------------------------------------------------------- guests' replies

interface GuestReplyBase {
  guestName: string;
  couple: string;
  title: string;
  passUrl: string;
  siteUrl: string;
}

export function rsvpAcceptedEmail(
  input: GuestReplyBase & {
    date: string;
    venue: string;
    attendingCount: number;
    dressCode?: string | null;
    tableName?: string | null;
  }
): BuiltEmail {
  return {
    subject: `Your seat is reserved: ${input.title}`.slice(0, 150),
    ...renderBrandEmail({
      siteUrl: input.siteUrl,
      preview: `Your seat is reserved for ${input.title}. Keep your pass close for the day.`,
      kicker: "Confirmation of attendance",
      headline: ["See you", { em: "there." }],
      subtitle: input.couple,
      greeting: `Dear ${input.guestName},`,
      paragraphs: [
        `We are delighted to confirm your seat for ${input.title}. We look forward to celebrating together.`,
      ],
      rows: [
        { label: "Date", value: input.date },
        { label: "Venue", value: input.venue },
        { label: "Your party", value: seats(input.attendingCount) },
        { label: "Dress code", value: input.dressCode ?? "" },
        { label: "Your table", value: input.tableName ?? "" },
      ],
      cta: {
        title: "Your pass for the day.",
        note: "Show it at the entrance and you’ll be welcomed straight in.",
        label: "Open my pass",
        url: input.passUrl,
        finePrint: "Made for you. Please keep your personal link private.",
      },
      showFallbackLink: true,
      signoff: "Here’s to a beautiful day together.",
      signature: `With love, ${input.couple}`,
      reason: `Sent because you replied to ${input.title} on Àríyá.`,
    }),
  };
}

export function rsvpDeclinedEmail(input: GuestReplyBase): BuiltEmail {
  return {
    subject: `Your reply was received: ${input.title}`.slice(0, 150),
    ...renderBrandEmail({
      siteUrl: input.siteUrl,
      preview: `Your reply for ${input.title} reached ${input.couple}.`,
      kicker: "Reply received",
      headline: ["You’ll be", { em: "missed." }],
      subtitle: input.couple,
      greeting: `Dear ${input.guestName},`,
      paragraphs: [
        `We have received your regrets for ${input.title}. Though you cannot be there, your warm wishes are with the couple.`,
        "If your plans change, you can update your reply at any time with the link below.",
      ],
      cta: {
        title: "Plans changed?",
        label: "Update my reply",
        url: input.passUrl,
        finePrint: "Made for you. Please keep your personal link private.",
      },
      signoff: "Thank you for letting us know.",
      signature: `With love, ${input.couple}`,
      reason: `Sent because you replied to ${input.title} on Àríyá.`,
    }),
  };
}

export function rsvpRevisedEmail(
  input: GuestReplyBase & {
    status: "accepted" | "declined";
    attendingCount: number;
    dietary?: string | null;
  }
): BuiltEmail {
  const attending = input.status === "accepted";
  return {
    subject: `Your reply was updated: ${input.title}`.slice(0, 150),
    ...renderBrandEmail({
      siteUrl: input.siteUrl,
      preview: `Your updated reply for ${input.title} is saved.`,
      kicker: "Reply updated",
      headline: attending
        ? ["All", { em: "noted." }]
        : ["Reply", { em: "updated." }],
      subtitle: input.couple,
      greeting: `Dear ${input.guestName},`,
      paragraphs: [
        `Your reply for ${input.title} has been updated. Here’s what we have now.`,
      ],
      rows: [
        {
          label: "Your reply",
          value: attending ? "Attending" : "Not attending",
        },
        {
          label: "Your party",
          value: attending ? seats(input.attendingCount, "guest") : "",
        },
        { label: "Dietary needs", value: input.dietary ?? "" },
      ],
      cta: {
        title: attending ? "Your pass for the day." : "Plans changed again?",
        label: attending ? "Open my pass" : "Update my reply",
        url: input.passUrl,
        finePrint: "Made for you. Please keep your personal link private.",
      },
      signoff: "Thank you for keeping us posted.",
      signature: `With love, ${input.couple}`,
      reason: `Sent because you updated your reply to ${input.title} on Àríyá.`,
    }),
  };
}

export function reminderEmail(input: {
  guestName: string;
  couple: string;
  title?: string | null;
  date: string;
  venue: string;
  subject?: string | null;
  message?: string | null;
  rsvpUrl: string;
  siteUrl: string;
}): BuiltEmail {
  const occasion = input.title?.trim() || `the celebration of ${input.couple}`;
  return {
    subject: (input.subject?.trim() || `A gentle reminder: ${occasion}`).slice(
      0,
      150
    ),
    ...renderBrandEmail({
      siteUrl: input.siteUrl,
      preview: `${input.couple} would love to know if you can make it.`,
      kicker: "A gentle reminder",
      headline: ["Will you", { em: "be there?" }],
      subtitle: input.couple,
      greeting: `Dear ${input.guestName},`,
      paragraphs: [
        `${input.couple} are looking forward to celebrating with you and would love to know if you can make it.`,
        ...(input.message?.trim() ? [input.message.trim()] : []),
      ],
      rows: [
        { label: "Date", value: input.date },
        { label: "Venue", value: input.venue },
      ],
      cta: {
        title: "A little reply. A lovely day.",
        note: "It takes less than a minute.",
        label: "Reply to my invitation",
        url: input.rsvpUrl,
        finePrint: "Made for you. Please keep your personal link private.",
      },
      showFallbackLink: true,
      signoff: "Here’s to your kind of celebration.",
      signature: `With love, ${input.couple}`,
      reason: `Sent because ${input.couple} invited you through Àríyá.`,
    }),
  };
}
