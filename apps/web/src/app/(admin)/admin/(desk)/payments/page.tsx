import Link from "next/link";
import type { Metadata } from "next";
import {
  PAGE_SIZE,
  PAYMENT_FILTERS,
  listPayments,
  type PaymentFilter,
} from "@/features/admin/queries";
import {
  DataTable,
  PageTitle,
  Pager,
  Pill,
  Td,
  naira,
  pageFrom,
  paymentTone,
  textFrom,
  when,
} from "@/features/admin/components/ui";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = textFrom(sp.filter, 20);
  const filter: PaymentFilter = (PAYMENT_FILTERS as readonly string[]).includes(
    raw
  )
    ? (raw as PaymentFilter)
    : "all";
  const page = pageFrom(sp.page);
  const { total, rows } = await listPayments(filter, page);

  return (
    <>
      <PageTitle
        title="Payments"
        sub="Every Celebration Pass checkout, newest first."
      />
      <nav aria-label="Filter" className="mb-4">
        <StatusFilters filter={filter} />
      </nav>
      <DataTable
        head={[
          "Reference",
          "Celebration",
          "Paid by",
          "Amount",
          "Status",
          "Started",
        ]}
        rows={rows.length}
        empty="No payments here."
      >
        {rows.map((p) => (
          <tr key={p.id}>
            <Td>
              <Link
                className="font-mono text-xs text-burgundy hover:underline"
                href={`/admin/payments/${p.id}`}
              >
                {p.paystack_reference}
              </Link>
            </Td>
            <Td>{p.event?.title ?? "Deleted celebration"}</Td>
            <Td>{p.profile?.email ?? "—"}</Td>
            <Td className="tabular-nums">{naira(p.amount_kobo)}</Td>
            <Td>
              <span className="flex flex-wrap gap-1">
                <Pill tone={paymentTone(p.status)}>{p.status}</Pill>
                {p.channel === "complimentary" && (
                  <Pill tone="gold">Complimentary</Pill>
                )}
              </span>
            </Td>
            <Td>{when(p.created_at)}</Td>
          </tr>
        ))}
      </DataTable>
      <Pager
        path="/admin/payments"
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        params={{ filter: filter === "all" ? undefined : filter }}
      />
    </>
  );
}

/** Payments are found by status here, or from an account or a celebration. */
function StatusFilters({ filter }: { filter: PaymentFilter }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PAYMENT_FILTERS.map((f) => (
        <Link
          key={f}
          href={f === "all" ? "/admin/payments" : `/admin/payments?filter=${f}`}
          aria-current={filter === f ? "page" : undefined}
          className={
            filter === f
              ? "inline-flex min-h-9 items-center rounded-full border border-night bg-night px-3 text-xs font-semibold capitalize text-gold"
              : "inline-flex min-h-9 items-center rounded-full border border-hairline bg-white/60 px-3 text-xs font-semibold capitalize text-label-2 hover:text-night"
          }
        >
          {f}
        </Link>
      ))}
    </div>
  );
}
