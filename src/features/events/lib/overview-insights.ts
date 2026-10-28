/**
 * The celebration desk's derived views: readiness across five areas, the planning phases leading to the day,
 * the vendor budget, the one next thing worth doing, and the layout of the guest constellation.
 * Everything here is pure and computed from data the app already holds.
 */
import type { EventMetrics } from "../types";

export interface PlanningVendor {
  id: string;
  name: string;
  category: string;
  costKobo: number;
  depositKobo: number;
  status: "draft" | "contracted" | "confirmed" | "completed" | string;
}

export interface PlanningTask {
  id: string;
  task: string;
  dueDate: string | null; // YYYY-MM-DD
  isDone: boolean;
  vendorName: string | null;
}

export interface ConstellationGuest {
  id: string;
  name: string;
  side: string | null;
  partySize: number;
  status: "accepted" | "declined" | "pending";
}

/* ---------- Readiness: five rings to close ---------- */

export type ReadinessKey =
  "guests" | "seating" | "vendors" | "budget" | "tasks";

export interface ReadinessSegment {
  key: ReadinessKey;
  label: string;
  done: number;
  total: number;
  /** 0 to 1; 0 when there is nothing to measure yet. */
  ratio: number;
  /** A short "18/20 replied" style summary. */
  summary: string;
}

export interface Readiness {
  segments: ReadinessSegment[];
  /** Whole percent, the plain average of the five segments. */
  overall: number;
}

const ratioOf = (done: number, total: number) =>
  total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;

export function computeReadiness(
  metrics: EventMetrics,
  vendors: PlanningVendor[],
  tasks: PlanningTask[]
): Readiness {
  const responded = metrics.acceptedParties + metrics.declinedParties;
  const bookedVendors = vendors.filter(
    (v) => v.status === "confirmed" || v.status === "completed"
  ).length;
  const committed = vendors.reduce((s, v) => s + Math.max(0, v.costKobo), 0);
  const paid = vendors.reduce(
    (s, v) => s + Math.max(0, Math.min(v.depositKobo, v.costKobo)),
    0
  );
  const doneTasks = tasks.filter((t) => t.isDone).length;
  const seatTotal = metrics.acceptedGuests;

  const segments: ReadinessSegment[] = [
    {
      key: "guests",
      label: "Guests replied",
      done: responded,
      total: metrics.totalParties,
      ratio: ratioOf(responded, metrics.totalParties),
      summary: `${responded}/${metrics.totalParties} replied`,
    },
    {
      key: "seating",
      label: "Seated",
      done: Math.min(metrics.seatedGuests, seatTotal),
      total: seatTotal,
      ratio: ratioOf(metrics.seatedGuests, seatTotal),
      summary: `${Math.min(metrics.seatedGuests, seatTotal)}/${seatTotal} seated`,
    },
    {
      key: "vendors",
      label: "Vendors confirmed",
      done: bookedVendors,
      total: vendors.length,
      ratio: ratioOf(bookedVendors, vendors.length),
      summary: `${bookedVendors}/${vendors.length} confirmed`,
    },
    {
      key: "budget",
      label: "Deposits paid",
      done: paid,
      total: committed,
      ratio: ratioOf(paid, committed),
      summary:
        committed > 0
          ? `${Math.round(ratioOf(paid, committed) * 100)}% paid`
          : "No costs yet",
    },
    {
      key: "tasks",
      label: "Tasks done",
      done: doneTasks,
      total: tasks.length,
      ratio: ratioOf(doneTasks, tasks.length),
      summary: `${doneTasks}/${tasks.length} done`,
    },
  ];

  const overall = Math.round(
    (segments.reduce((s, seg) => s + seg.ratio, 0) / segments.length) * 100
  );
  return { segments, overall };
}

/* ---------- Planning phases, counted back from the day ---------- */

export type PhaseState = "done" | "current" | "upcoming";

export interface PlanningPhase {
  key: string;
  title: string;
  hint: string;
  /** Inclusive Lagos date keys (YYYY-MM-DD). */
  start: string;
  end: string;
  tasksDone: number;
  tasksTotal: number;
  state: PhaseState;
  /** The tasks filed in this phase, earliest due first. */
  tasks: PlanningTask[];
}

const DAY_MS = 86_400_000;

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Five phases ending on the wedding day. Each owns the tasks due inside it; tasks with no due date
 * belong to the current phase so nothing goes missing.
 */
export function buildPlanningPhases(
  eventDateKey: string | null,
  tasks: PlanningTask[],
  todayKey: string
): PlanningPhase[] {
  if (!eventDateKey) return [];
  const spans: {
    key: string;
    title: string;
    hint: string;
    from: number;
    to: number;
  }[] = [
    {
      key: "foundations",
      title: "Foundations",
      hint: "Budget, venue, the guest list",
      from: -100000,
      to: -181,
    },
    {
      key: "bookings",
      title: "Vendors & bookings",
      hint: "Caterer, DJ, decor, photo",
      from: -180,
      to: -91,
    },
    {
      key: "invitations",
      title: "Invitations & aso ebi",
      hint: "Cards out, fabric shared",
      from: -90,
      to: -43,
    },
    {
      key: "final",
      title: "Final fittings",
      hint: "Headcount, seating, run of show",
      from: -42,
      to: -8,
    },
    {
      key: "owambe",
      title: "Owambe week",
      hint: "Confirm, rehearse, celebrate",
      from: -7,
      to: 0,
    },
  ];

  const phases = spans.map((s) => {
    const start =
      s.from <= -100000 ? "0000-01-01" : addDays(eventDateKey, s.from);
    const end = addDays(eventDateKey, s.to);
    const state: PhaseState =
      todayKey > end ? "done" : todayKey >= start ? "current" : "upcoming";
    return {
      key: s.key,
      title: s.title,
      hint: s.hint,
      start,
      end,
      tasksDone: 0,
      tasksTotal: 0,
      state,
      tasks: [] as PlanningTask[],
    };
  });

  // After the day every phase is behind us; before the first, the first is current.
  if (!phases.some((p) => p.state === "current") && todayKey <= phases[0].end) {
    phases[0].state = "current";
  }
  const current =
    phases.find((p) => p.state === "current") ?? phases[phases.length - 1];

  for (const t of tasks) {
    const home = t.dueDate
      ? (phases.find((p) => t.dueDate! >= p.start && t.dueDate! <= p.end) ??
        (t.dueDate > eventDateKey ? phases[phases.length - 1] : phases[0]))
      : current;
    home.tasksTotal++;
    if (t.isDone) home.tasksDone++;
    home.tasks.push(t);
  }
  for (const p of phases) {
    p.tasks.sort((a, b) =>
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")
    );
  }
  return phases;
}

/* ---------- Budget from vendor costs ---------- */

export interface BudgetCategory {
  category: string;
  costKobo: number;
  paidKobo: number;
  vendors: number;
}

export interface BudgetSummary {
  committedKobo: number;
  paidKobo: number;
  outstandingKobo: number;
  categories: BudgetCategory[];
}

export function summariseBudget(vendors: PlanningVendor[]): BudgetSummary {
  const byCat = new Map<string, BudgetCategory>();
  for (const v of vendors) {
    const category = v.category?.trim() || "Other";
    const row = byCat.get(category) ?? {
      category,
      costKobo: 0,
      paidKobo: 0,
      vendors: 0,
    };
    row.costKobo += Math.max(0, v.costKobo);
    row.paidKobo += Math.max(0, v.depositKobo);
    row.vendors++;
    byCat.set(category, row);
  }
  const categories = [...byCat.values()].sort(
    (a, b) => b.costKobo - a.costKobo
  );
  const committedKobo = categories.reduce((s, c) => s + c.costKobo, 0);
  const paidKobo = categories.reduce((s, c) => s + c.paidKobo, 0);
  return {
    committedKobo,
    paidKobo,
    outstandingKobo: Math.max(0, committedKobo - paidKobo),
    categories,
  };
}

/* ---------- The one next thing ---------- */

export interface NextAction {
  title: string;
  reason: string;
  href: string;
  cta: string;
  tone: "urgent" | "steady" | "celebrate";
}

export interface NextActionInput {
  eventId: string;
  metrics: EventMetrics;
  vendors: PlanningVendor[];
  tasks: PlanningTask[];
  todayKey: string;
}

/**
 * Everything worth doing next, most pressing first: overdue vendor tasks, replies close to the day,
 * guests to seat, vendors to line up or confirm, deposits to pay. When nothing is left, one
 * celebration.
 */
export function pickNextActions(input: NextActionInput): NextAction[] {
  const { eventId, metrics, vendors, tasks, todayKey } = input;
  const base = `/events/${eventId}`;
  const overdue = tasks
    .filter((t) => !t.isDone && t.dueDate && t.dueDate < todayKey)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const days = metrics.daysAway;
  const out: NextAction[] = [];

  if (metrics.totalParties === 0) {
    out.push({
      title: "Start the guest list",
      reason:
        "Every invitation, seat and plate begins here. Import a CSV or add your first guests.",
      href: `${base}/guests`,
      cta: "Add guests",
      tone: "steady",
    });
  }
  if (overdue.length > 0) {
    const t = overdue[0];
    out.push({
      title: `Overdue: ${t.task}`,
      reason: `${overdue.length === 1 ? "1 vendor task is" : `${overdue.length} vendor tasks are`} past due${t.vendorName ? `, starting with ${t.vendorName}` : ""}.`,
      href: `${base}/vendors`,
      cta: "Open vendors",
      tone: "urgent",
    });
  }
  if (metrics.awaitingParties > 0 && days <= 30) {
    out.push({
      title: `Nudge ${metrics.awaitingParties} ${metrics.awaitingParties === 1 ? "party" : "parties"} still to reply`,
      reason: `The caterer needs a headcount soon and the day is ${days === 0 ? "today" : `${days} days away`}. A gentle reminder now saves guesswork later.`,
      href: `${base}/guests`,
      cta: "Send reminders",
      tone: days <= 7 ? "urgent" : "steady",
    });
  }
  if (metrics.unassignedGuests > 0 && metrics.acceptedGuests > 0) {
    out.push({
      title: `Seat ${metrics.unassignedGuests} confirmed ${metrics.unassignedGuests === 1 ? "guest" : "guests"}`,
      reason:
        "They've said yes. Give every one of them a place at a table before the doors open.",
      href: `${base}/seating`,
      cta: "Open seating",
      tone: "steady",
    });
  }
  if (vendors.length === 0) {
    out.push({
      title: "Line up your vendors",
      reason:
        "Caterer, small chops, DJ or live band, MC, decor, photo, makeup and gele: track costs and deposits in one place.",
      href: `${base}/vendors`,
      cta: "Add vendors",
      tone: "steady",
    });
  } else {
    const unconfirmed = vendors.filter(
      (v) => v.status !== "confirmed" && v.status !== "completed"
    ).length;
    if (unconfirmed > 0) {
      out.push({
        title: `Confirm ${unconfirmed} ${unconfirmed === 1 ? "vendor" : "vendors"}`,
        reason: "A confirmed vendor is one you can stop worrying about.",
        href: `${base}/vendors`,
        cta: "Open vendors",
        tone: "steady",
      });
    }
  }
  if (metrics.awaitingParties > 0 && days > 30) {
    out.push({
      title: `${metrics.awaitingParties} ${metrics.awaitingParties === 1 ? "party hasn't" : "parties haven't"} replied yet`,
      reason: "Plenty of time, but a reminder keeps the count honest.",
      href: `${base}/guests`,
      cta: "View guests",
      tone: "steady",
    });
  }
  if (out.length === 0) {
    out.push({
      title: "E kú iṣẹ́! Everything is on track",
      reason:
        "Every guest has replied and every confirmed guest has a seat. Enjoy the run-up.",
      href: `${base}/check-in`,
      cta: "Preview check-in",
      tone: "celebrate",
    });
  }
  return out;
}

/** The single most pressing next step. */
export function pickNextAction(input: NextActionInput): NextAction {
  return pickNextActions(input)[0];
}

/* ---------- Guest constellation layout ---------- */

export interface ConstellationDot {
  id: string;
  name: string;
  status: ConstellationGuest["status"];
  side: string;
  x: number;
  y: number;
  r: number;
}

export interface ConstellationLayout {
  width: number;
  height: number;
  dots: ConstellationDot[];
  groups: { label: string; x: number; count: number }[];
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const round2 = (n: number) => Math.round(n * 100) / 100;
export const CONSTELLATION_W = 360;
export const CONSTELLATION_H = 200;

/**
 * One dot per guest party, laid out as sunflowers: the bride's people in one bloom, the groom's in
 * another, everyone else in a third. Coordinates are in a 360 x 200 viewBox. Deterministic, so the
 * picture never jumps between renders. Confirmed guests sit at the heart of each bloom.
 */
export function layoutConstellation(
  guests: ConstellationGuest[]
): ConstellationLayout {
  const groupOf = (side: string | null) =>
    side === "Bride" ? "Bride" : side === "Groom" ? "Groom" : "Family";
  const order = ["Bride", "Family", "Groom"];
  const groups = order
    .map((label) => ({
      label,
      items: guests.filter((x) => groupOf(x.side) === label),
    }))
    .filter((x) => x.items.length > 0);
  const W = CONSTELLATION_W;
  const H = CONSTELLATION_H;
  if (groups.length === 0) return { width: W, height: H, dots: [], groups: [] };

  const statusRank = { accepted: 0, pending: 1, declined: 2 } as const;
  const cellW = W / groups.length;
  const bloomR = Math.min(cellW / 2, (H - 24) / 2) * 0.92;
  const dots: ConstellationDot[] = [];
  const labels: ConstellationLayout["groups"] = [];
  groups.forEach((group, gi) => {
    const cx = cellW * (gi + 0.5);
    const cy = (H - 20) / 2;
    const items = [...group.items].sort(
      (a, b) =>
        statusRank[a.status] - statusRank[b.status] ||
        a.name.localeCompare(b.name)
    );
    const n = items.length;
    // Dot size shrinks as the bloom fills, so a 600-guest wedding still fits.
    const base = Math.max(1.6, Math.min(5, bloomR / Math.sqrt(n) / 1.15));
    items.forEach((guest, i) => {
      const rr = bloomR * Math.sqrt((i + 0.5) / n);
      const a = i * GOLDEN_ANGLE;
      // Rounded so the server's and the browser's trigonometry agree to the last digit.
      dots.push({
        id: guest.id,
        name: guest.name,
        status: guest.status,
        side: group.label,
        x: round2(cx + rr * Math.cos(a)),
        y: round2(cy + rr * Math.sin(a)),
        r: round2(
          base * (1 + Math.min(0.6, (Math.max(1, guest.partySize) - 1) * 0.15))
        ),
      });
    });
    labels.push({ label: group.label, x: cx, count: n });
  });
  return { width: W, height: H, dots, groups: labels };
}

/**
 * Naira in short form ("₦4.5M", "₦850K"). Hand-rolled because Intl's compact notation differs between
 * Node and browsers, which would make the server and client disagree.
 */
export function formatNairaCompact(kobo: number): string {
  const n = Math.max(0, kobo) / 100;
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const v = n / size;
      const text =
        v >= 100 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, "");
      return `₦${text}${suffix}`;
    }
  }
  return `₦${Math.round(n)}`;
}
