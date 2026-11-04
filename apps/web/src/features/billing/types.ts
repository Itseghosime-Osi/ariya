import type { EventRole } from "../team/types";

export interface PaymentItem {
  id: string;
  paystackReference: string;
  amountKobo: number;
  status: "pending" | "success" | "failed" | "refunded";
  channel: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amountKobo: number;
  status: "draft" | "issued" | "paid" | "void";
  issuedAt: string;
  paidAt: string | null;
}

export interface BillingDeskData {
  eventId: string;
  eventTitle: string;
  isPaid: boolean;
  paidAt: string | null;
  currentUserRole: EventRole;
  isStaffBlocked: boolean;
  canManageBilling: boolean;
  payments: PaymentItem[];
  invoices: InvoiceItem[];
}
