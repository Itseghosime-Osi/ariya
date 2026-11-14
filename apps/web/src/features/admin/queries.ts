import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FREE_PLAN_LIMIT,
  FREE_PLAN_WARN_THRESHOLD,
} from "@/features/events/lib/needs-attention";
import { requireAdmin } from "./guard";

/**
 * Reads for the admin desk. Every function checks the admin first (a page that forgot to would
 * still be safe), then reads with the service-role key, which sees across every account.
 */

export const PAGE_SIZE = 25;

type Json = Record<string, unknown>;

async function db() {
  await requireAdmin();
  return createAdminClient();
}

function asPage<T>(raw: unknown): { total: number; rows: T[] } {
  const obj = (raw ?? {}) as { total?: number; rows?: T[] };
  return { total: Number(obj.total ?? 0), rows: obj.rows ?? [] };
}

export interface Overview {
  accounts: { total: number; d1: number; d7: number; d30: number };
  events: { total: number; upcoming: number; d7: number; d30: number };
  invitations: { d1: number; d7: number; d30: number };
  replies: { d7: number; d30: number };
  checkins: { d7: number; d30: number };
  revenue: {
    total_kobo: number;
    d30_kobo: number;
    paid_events: number;
    complimentary: number;
    refunded: number;
  };
  conversion: { sending_events: number; paid_sending_events: number };
  near_limit: {
    id: string;
    title: string;
    date: string;
    invited: number;
    owner_email: string | null;
  }[];
  free_limit: number;
}

export async function getOverview(): Promise<Overview> {
  const client = await db();
  const { data, error } = await client.rpc("admin_overview", {
    p_warn_at: FREE_PLAN_WARN_THRESHOLD,
    p_free_limit: FREE_PLAN_LIMIT,
  });
  if (error) throw new Error(error.message);
  return data as unknown as Overview;
}

export interface AccountRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  provider: string;
  celebrations: number;
  is_admin: boolean;
}

export async function listAccounts(query: string, page: number) {
  const client = await db();
  const { data, error } = await client.rpc("admin_accounts", {
    p_query: query,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return asPage<AccountRow>(data);
}

export interface EventRow {
  id: string;
  title: string;
  couple: string;
  date: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  is_public: boolean;
  ended: boolean;
  guests: number;
  invited: number;
  accepted: number;
  owner_email: string | null;
}

export const EVENT_FILTERS = [
  "all",
  "upcoming",
  "paid",
  "free",
  "ended",
  "archived",
] as const;
export type EventFilter = (typeof EVENT_FILTERS)[number];

export async function listEvents(
  query: string,
  filter: EventFilter,
  page: number
) {
  const client = await db();
  const { data, error } = await client.rpc("admin_events", {
    p_query: query,
    p_filter: filter,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return asPage<EventRow>(data);
}

export interface AccountDetail {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    created_at: string;
  };
  auth: {
    last_sign_in_at: string | null;
    banned_until: string | null;
    provider: string;
    email_confirmed: boolean;
  } | null;
  isAdmin: boolean;
  memberships: {
    role: string;
    event: {
      id: string;
      title: string;
      date: string;
      paid_at: string | null;
      status: string;
    } | null;
  }[];
  payments: PaymentRow[];
  connections: AiConnectionRow[];
  log: AuditRow[];
}

export async function getAccount(id: string): Promise<AccountDetail | null> {
  const client = await db();
  const { data: profile } = await client
    .from("profiles")
    .select("id, email, full_name, phone, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile) return null;

  const [authRes, adminRes, members, payments, connections, log] =
    await Promise.all([
      client.rpc("admin_account_activity", { p_users: [id] }),
      client.rpc("is_platform_admin", { p_user: id }),
      client
        .from("event_members")
        .select("role, event:events(id, title, date, paid_at, status)")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      client
        .from("payments")
        .select(PAYMENT_COLUMNS)
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      client.rpc("admin_ai_connections", { p_limit: 1000 }),
      client
        .from("admin_audit_log")
        .select("*")
        .eq("target_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const auth = (authRes.data as unknown as Json[] | null)?.[0];
  return {
    profile,
    auth: auth
      ? {
          last_sign_in_at: (auth.last_sign_in_at as string | null) ?? null,
          banned_until: (auth.banned_until as string | null) ?? null,
          provider: String(auth.provider ?? "email"),
          email_confirmed: Boolean(auth.email_confirmed),
        }
      : null,
    isAdmin: adminRes.data === true,
    memberships: (members.data ??
      []) as unknown as AccountDetail["memberships"],
    payments: (payments.data ?? []) as unknown as PaymentRow[],
    connections: ((connections.data ?? []) as AiConnectionRow[]).filter(
      (c) => c.user_id === id
    ),
    log: (log.data ?? []) as AuditRow[],
  };
}

export interface EventDetail {
  event: {
    id: string;
    title: string;
    couple: string;
    date: string;
    venue: string;
    slug: string;
    status: string;
    paid_at: string | null;
    is_public: boolean;
    invitation_live: boolean | null;
    created_at: string;
  };
  ended: boolean;
  team: { role: string; user_id: string; email: string | null }[];
  counts: {
    guests: number;
    invited: number;
    accepted: number;
    declined: number;
    tables: number;
    seated: number;
    checkedIn: number;
    emails: number;
  };
  payments: PaymentRow[];
  log: AuditRow[];
}

async function count(
  q: PromiseLike<{ count: number | null; error: unknown }>
): Promise<number> {
  const { count } = await q;
  return count ?? 0;
}

export async function getEvent(id: string): Promise<EventDetail | null> {
  const client = await db();
  const { data: event } = await client
    .from("events")
    .select(
      "id, title, couple, date, venue, slug, status, paid_at, is_public, invitation_live, created_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!event) return null;

  const head = { count: "exact" as const, head: true };
  const [
    team,
    guests,
    invited,
    accepted,
    declined,
    tables,
    seated,
    checkins,
    emails,
    payments,
    log,
  ] = await Promise.all([
    client
      .from("event_members")
      .select("role, user_id, profile:profiles(email)")
      .eq("event_id", id),
    count(client.from("guests").select("id", head).eq("event_id", id)),
    count(
      client
        .from("guests")
        .select("id", head)
        .eq("event_id", id)
        .not("invited_at", "is", null)
    ),
    count(
      client
        .from("rsvps")
        .select("id, guest:guests!inner(event_id)", head)
        .eq("guest.event_id", id)
        .eq("status", "accepted")
    ),
    count(
      client
        .from("rsvps")
        .select("id, guest:guests!inner(event_id)", head)
        .eq("guest.event_id", id)
        .eq("status", "declined")
    ),
    count(client.from("tables").select("id", head).eq("event_id", id)),
    count(
      client
        .from("seat_assignments")
        .select("id, table:tables!inner(event_id)", head)
        .eq("table.event_id", id)
    ),
    client.from("check_ins").select("checked_in_count").eq("event_id", id),
    count(client.from("email_log").select("id", head).eq("event_id", id)),
    client
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
    client
      .from("admin_audit_log")
      .select("*")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const { isEventExpired } = await import("@/lib/event-expiry");
  return {
    event,
    ended: isEventExpired(event.date),
    team: (
      (team.data ?? []) as unknown as {
        role: string;
        user_id: string;
        profile: { email: string } | null;
      }[]
    ).map((m) => ({
      role: m.role,
      user_id: m.user_id,
      email: m.profile?.email ?? null,
    })),
    counts: {
      guests,
      invited,
      accepted,
      declined,
      tables,
      seated,
      checkedIn: (checkins.data ?? []).reduce(
        (s, r) => s + (r.checked_in_count ?? 0),
        0
      ),
      emails,
    },
    payments: (payments.data ?? []) as unknown as PaymentRow[],
    log: (log.data ?? []) as AuditRow[],
  };
}

/** The guest list itself. Opening it is written to the admin log by the page that shows it. */
export async function getEventGuests(id: string) {
  const client = await db();
  const { data } = await client
    .from("guests")
    .select(
      "id, name, email, phone, party_size, invited_at, rsvps(status, attending_count)"
    )
    .eq("event_id", id)
    .order("name")
    .limit(2000);
  return (data ?? []) as unknown as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    party_size: number;
    invited_at: string | null;
    rsvps: { status: string; attending_count: number | null }[] | null;
  }[];
}

const PAYMENT_COLUMNS =
  "id, event_id, user_id, paystack_reference, amount_kobo, status, channel, paid_at, created_at, event:events(title), profile:profiles(email), invoices(invoice_number, status)";

export interface PaymentRow {
  id: string;
  event_id: string;
  user_id: string;
  paystack_reference: string;
  amount_kobo: number;
  status: "pending" | "success" | "failed" | "refunded";
  channel: string | null;
  paid_at: string | null;
  created_at: string;
  event: { title: string } | null;
  profile: { email: string } | null;
  invoices: { invoice_number: string; status: string }[] | null;
}

export const PAYMENT_FILTERS = [
  "all",
  "success",
  "pending",
  "failed",
  "refunded",
] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

export async function listPayments(filter: PaymentFilter, page: number) {
  const client = await db();
  let q = client
    .from("payments")
    .select(PAYMENT_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (filter !== "all") q = q.eq("status", filter);
  const { data, count: total, error } = await q;
  if (error) throw new Error(error.message);
  return {
    total: total ?? 0,
    rows: (data ?? []) as unknown as PaymentRow[],
  };
}

export async function getPayment(id: string): Promise<PaymentRow | null> {
  const client = await db();
  const { data } = await client
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as PaymentRow | null) ?? null;
}

export interface EmailRow {
  id: string;
  event_id: string;
  recipient_email: string;
  subject: string;
  template_type: string;
  status: string;
  sent_at: string;
  event: { title: string } | null;
}

export const EMAIL_FILTERS = ["all", "failed", "sent"] as const;
export type EmailFilter = (typeof EMAIL_FILTERS)[number];

export async function listEmails(filter: EmailFilter, page: number) {
  const client = await db();
  let q = client
    .from("email_log")
    .select(
      "id, event_id, recipient_email, subject, template_type, status, sent_at, event:events(title)",
      { count: "exact" }
    )
    .order("sent_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (filter === "failed") q = q.neq("status", "sent");
  if (filter === "sent") q = q.eq("status", "sent");
  const { data, count: total, error } = await q;
  if (error) throw new Error(error.message);

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: recent } = await client
    .from("email_log")
    .select("template_type, status")
    .gte("sent_at", since)
    .limit(10000);
  const byType = new Map<string, { sent: number; failed: number }>();
  for (const r of recent ?? []) {
    const t = byType.get(r.template_type) ?? { sent: 0, failed: 0 };
    if (r.status === "sent") t.sent += 1;
    else t.failed += 1;
    byType.set(r.template_type, t);
  }

  return {
    total: total ?? 0,
    rows: (data ?? []) as unknown as EmailRow[],
    last30: [...byType.entries()]
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.sent + b.failed - (a.sent + a.failed)),
  };
}

export interface AiConnectionRow {
  consent_id: string;
  user_id: string;
  user_email: string;
  client_id: string;
  client_name: string | null;
  redirect_uris: string | null;
  scopes: string;
  granted_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  calls_7d: number;
}

export async function listAiConnections() {
  const client = await db();
  const [conns, proposals] = await Promise.all([
    client.rpc("admin_ai_connections", { p_limit: 300 }),
    client
      .from("ai_proposals")
      .select("status")
      .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .limit(5000),
  ]);
  if (conns.error) throw new Error(conns.error.message);
  const decisions = new Map<string, number>();
  for (const p of proposals.data ?? []) {
    decisions.set(p.status, (decisions.get(p.status) ?? 0) + 1);
  }
  return {
    rows: (conns.data ?? []) as AiConnectionRow[],
    proposals30: [...decisions.entries()].map(([status, n]) => ({
      status,
      n,
    })),
  };
}

export interface Health {
  last_reminder_email: string | null;
  reminders_7d: number;
  last_digest: string | null;
  digests_7d: number;
  emails_failed_7d: number;
  studio_errors_7d: number;
  studio_exports_7d: number;
  payments_pending_over_1h: number;
  ai_errors_7d: number;
  ai_calls_7d: number;
}

export async function getHealth(): Promise<Health> {
  const client = await db();
  const { data, error } = await client.rpc("admin_health");
  if (error) throw new Error(error.message);
  return data as unknown as Health;
}

export interface AuditRow {
  id: number;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  reason: string | null;
  details: Json;
  created_at: string;
}

export async function listAudit(page: number) {
  const client = await db();
  const {
    data,
    count: total,
    error,
  } = await client
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { total: total ?? 0, rows: (data ?? []) as AuditRow[] };
}
