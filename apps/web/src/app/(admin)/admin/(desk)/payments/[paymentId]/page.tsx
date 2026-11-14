import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getPayment } from "@/features/admin/queries";
import {
  recheckPaymentAction,
  refundPaymentAction,
} from "@/features/admin/actions";
import { AdminAction } from "@/features/admin/components/AdminAction";
import {
  PageTitle,
  Pill,
  Section,
  Stat,
  StatGrid,
  naira,
  paymentTone,
  when,
} from "@/features/admin/components/ui";
import { adm } from "@/features/admin/path";

export const metadata: Metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  if (!z.string().uuid().safeParse(paymentId).success) notFound();
  const p = await getPayment(paymentId);
  if (!p) notFound();
  const comp =
    p.channel === "complimentary" || p.paystack_reference.startsWith("COMP-");
  const invoice = p.invoices?.[0];

  return (
    <>
      <p className="mb-2 text-sm">
        <Link
          href={adm("/admin/payments")}
          className="text-label-2 hover:underline"
        >
          Payments
        </Link>
      </p>
      <PageTitle
        title={p.paystack_reference}
        sub={p.event?.title ?? "Deleted celebration"}
      >
        <span className="flex gap-1">
          <Pill tone={paymentTone(p.status)}>{p.status}</Pill>
          {comp && <Pill tone="gold">Complimentary</Pill>}
        </span>
      </PageTitle>

      <StatGrid>
        <Stat label="Amount" value={naira(p.amount_kobo)} />
        <Stat label="Started" value={when(p.created_at)} />
        <Stat label="Paid" value={when(p.paid_at)} />
        <Stat
          label="Invoice"
          value={invoice ? invoice.invoice_number : "—"}
          hint={invoice?.status}
        />
      </StatGrid>

      <p className="mt-4 text-sm text-label-2">
        Paid by{" "}
        <Link
          className="text-burgundy hover:underline"
          href={adm(`/admin/accounts/${p.user_id}`)}
        >
          {p.profile?.email ?? p.user_id}
        </Link>{" "}
        for{" "}
        <Link
          className="text-burgundy hover:underline"
          href={adm(`/admin/events/${p.event_id}`)}
        >
          {p.event?.title ?? "a deleted celebration"}
        </Link>
        {p.channel && !comp && <> · via {p.channel}</>}.
      </p>

      <Section title="Actions">
        <div className="grid gap-3">
          {!comp && (
            <AdminAction
              label="Re-check with Paystack"
              description="Asks Paystack for this payment's real status. A payment Paystack says succeeded is recorded and the celebration unlocked; one it says failed is marked failed."
              needsReason={false}
              run={recheckPaymentAction.bind(null, p.id)}
            />
          )}
          {p.status === "success" && (
            <AdminAction
              label={comp ? "Withdraw the pass" : "Refund"}
              description={
                comp
                  ? "Withdraws this complimentary pass. The celebration loses its pass unless another payment covers it."
                  : `Refunds ${naira(p.amount_kobo)} in full through Paystack, voids the invoice, and removes the celebration's pass unless another payment covers it. Paystack sends the money back over the next few days. Cannot be undone.`
              }
              danger
              confirmPrompt="Type the reference"
              confirmValue={p.paystack_reference}
              run={refundPaymentAction.bind(null, p.id)}
            />
          )}
        </div>
      </Section>
    </>
  );
}
