import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BillingDeskData, PaymentItem, InvoiceItem } from "./types";
import type { EventRole } from "../team/types";

export async function getBillingDeskData(
  eventId: string
): Promise<BillingDeskData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch event membership to check role
  const { data: member } = await supabase
    .from("event_members")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return null;

  const currentUserRole = member.role as EventRole;
  const isStaffBlocked = currentUserRole === "staff";
  const canManageBilling =
    currentUserRole === "owner" || currentUserRole === "planner";

  // If staff is viewing, return blocked state immediately
  if (isStaffBlocked) {
    return {
      eventId,
      eventTitle: "Celebration",
      isPaid: false,
      paidAt: null,
      currentUserRole,
      isStaffBlocked: true,
      canManageBilling: false,
      payments: [],
      invoices: [],
    };
  }

  // 2. Fetch event
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, title, paid_at")
    .eq("id", eventId)
    .single();

  if (eventErr) {
    console.error("[getBillingDeskData] Database error loading event:", {
      code: eventErr.code,
      message: eventErr.message,
    });
    throw new Error(`Database error loading event: ${eventErr.message}`);
  }

  if (!event) return null;

  // 3. Fetch payments and invoices (accessible to owner, planner, couple)
  const { data: rawPayments } = await supabase
    .from("payments")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const { data: rawInvoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("event_id", eventId)
    .order("issued_at", { ascending: false });

  const payments: PaymentItem[] = (rawPayments || []).map((p) => ({
    id: p.id,
    paystackReference: p.paystack_reference,
    amountKobo: p.amount_kobo,
    status: p.status as PaymentItem["status"],
    channel: p.channel,
    paidAt: p.paid_at,
    createdAt: p.created_at,
  }));

  const invoices: InvoiceItem[] = (rawInvoices || []).map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    amountKobo: inv.amount_kobo,
    status: inv.status as InvoiceItem["status"],
    issuedAt: inv.issued_at,
    paidAt: inv.paid_at,
  }));

  return {
    eventId: event.id,
    eventTitle: event.title,
    isPaid: !!event.paid_at,
    paidAt: event.paid_at,
    currentUserRole,
    isStaffBlocked: false,
    canManageBilling,
    payments,
    invoices,
  };
}
