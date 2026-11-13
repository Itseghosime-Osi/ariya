/**
 * What a host has seen of the onboarding, kept on their account (the sign-in's own metadata) so it
 * follows them from phone to laptop. No table holds it: it is a few flags, read with the session.
 */

export type HostRole = "couple" | "planner";

export interface Onboarding {
  /** The welcome card was answered or closed. */
  welcomed?: boolean;
  /** The dashboard tour was finished or skipped; absent means it has not been offered yet. */
  tour?: "done" | "skipped";
  /** The First steps card was closed, or finished and seen. */
  firstStepsHidden?: boolean;
  /** Page tip cards already dismissed, by key. */
  tips?: string[];
}

const TIP_KEY = /^[a-z0-9-]{1,40}$/;

/** Read the flags from user metadata, ignoring anything malformed. */
export function readOnboarding(meta: unknown): Onboarding {
  const raw =
    meta && typeof meta === "object"
      ? (meta as Record<string, unknown>).onboarding
      : undefined;
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Onboarding = {};
  if (r.welcomed === true) out.welcomed = true;
  if (r.tour === "done" || r.tour === "skipped") out.tour = r.tour;
  if (r.firstStepsHidden === true) out.firstStepsHidden = true;
  if (Array.isArray(r.tips)) {
    const tips = Array.from(
      new Set(
        r.tips.filter(
          (t): t is string => typeof t === "string" && TIP_KEY.test(t)
        )
      )
    ).slice(0, 40);
    if (tips.length) out.tips = tips;
  }
  return out;
}

/** The role chosen at sign-up, defaulting to a couple planning their own day. */
export function readRole(meta: unknown): HostRole {
  const role =
    meta && typeof meta === "object"
      ? (meta as Record<string, unknown>).role
      : undefined;
  return role === "planner" ? "planner" : "couple";
}

/** Merge a change into the flags, keeping tips unique. */
export function mergeOnboarding(
  base: Onboarding,
  patch: Onboarding
): Onboarding {
  const tips = Array.from(
    new Set([...(base.tips ?? []), ...(patch.tips ?? [])])
  );
  return readOnboarding({
    onboarding: { ...base, ...patch, ...(tips.length ? { tips } : {}) },
  });
}

// ---------------------------------------------------------------- first steps

/** What the First steps card needs to know about one celebration. */
export interface FirstStepsStatus {
  guests: number;
  invitationDesigned: boolean;
  invitesSent: number;
  tables: number;
  teamMembers: number;
}

export interface FirstStep {
  key: "guests" | "invitation" | "send" | "seating" | "team";
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

/** The five first steps for a celebration, in order, each ticked from the real data. */
export function firstSteps(
  eventId: string,
  s: FirstStepsStatus,
  role: HostRole
): FirstStep[] {
  const base = `/events/${eventId}`;
  return [
    {
      key: "guests",
      label: "Add your guests",
      hint: "Type them in or import a list. Everything else builds on it.",
      href: `${base}/guests`,
      done: s.guests > 0,
    },
    {
      key: "invitation",
      label: "Design the invitation",
      hint: "Pick a look and put in the names, date and venue.",
      href: `${base}/invitations`,
      done: s.invitationDesigned,
    },
    {
      key: "send",
      label: "Send the invitations",
      hint: "Each guest gets their own link to reply.",
      href: `${base}/invitations`,
      done: s.invitesSent > 0,
    },
    {
      key: "seating",
      label: "Lay out the seating",
      hint: "Draw the hall, add tables and seat everyone who said yes.",
      href: `${base}/seating`,
      done: s.tables > 0,
    },
    {
      key: "team",
      label:
        role === "planner" ? "Invite your client and team" : "Invite your team",
      hint:
        role === "planner"
          ? "Share the plan with the couple and the people helping you."
          : "Share the planning with family and friends who are helping.",
      href: `${base}/team`,
      done: s.teamMembers > 1,
    },
  ];
}

// ---------------------------------------------------------------- tour

export interface TourStop {
  key: string;
  /** CSS selectors for the thing to point at, tried in order; the first visible one wins. */
  targets: string[];
  title: string;
  body: string;
  /** What to say instead on a phone, where the menu is the dock and there is no keyboard. */
  phoneBody?: string;
}

/** The dashboard tour, shaped by who is planning. Stops whose target is not on screen are skipped. */
export function tourStops(role: HostRole): TourStop[] {
  const nav: TourStop = {
    key: "nav",
    targets: ['[data-tour="nav"]', '[data-tour="dock"]'],
    title: "Everything lives here",
    body: "Planning, On the day and Manage: every page for this celebration is in this menu, in the order you will need them.",
    phoneBody:
      "Home, Guests and Check-in are always one tap away. More holds every other page for this celebration.",
  };
  const switcher: TourStop = {
    key: "switcher",
    targets: ['[data-tour="switcher"]', '[data-tour="dock-more"]'],
    title: "One place for every client",
    body: "Switch between the celebrations you are planning here. Each one keeps its own guests, seating and vendors.",
    phoneBody:
      "Open More to switch between the celebrations you are planning. Each keeps its own guests, seating and vendors.",
  };
  const nextUp: TourStop = {
    key: "next-up",
    targets: ['[data-tour="next-up"]'],
    title: "Your next step, always",
    body: "We look at the whole plan and put the most important thing to do here, with a link straight to it.",
  };
  const steps: TourStop = {
    key: "first-steps",
    targets: ['[data-tour="first-steps"]'],
    title: "Start with these five",
    body: "Work through them in any order. Each one ticks itself as soon as it is done.",
  };
  const guests: TourStop = {
    key: "guests",
    targets: [
      '[data-tour="nav"] a[href$="/guests"]',
      '[data-tour="dock"] a[href$="/guests"]',
    ],
    title: "Begin with your guest list",
    body: "Invitations, replies, seating and check-in all build on it, so it is the best place to start.",
  };
  const search: TourStop = {
    key: "search",
    targets: ['[data-tour="search"]', '[data-tour="create"]'],
    title: "Find or add anything",
    body: "Search for any guest, table or vendor from any page, or press ⌘K.",
    phoneBody:
      "Tap + to add a guest, a task or a table from any page. Search sits at the top of the screen.",
  };
  return role === "planner"
    ? [nav, switcher, nextUp, steps, search]
    : [nav, nextUp, steps, guests, search];
}
