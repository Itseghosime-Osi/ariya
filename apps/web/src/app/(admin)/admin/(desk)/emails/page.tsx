import Link from "next/link";
import type { Metadata } from "next";
import {
  EMAIL_FILTERS,
  PAGE_SIZE,
  listEmails,
  type EmailFilter,
} from "@/features/admin/queries";
import {
  DataTable,
  PageTitle,
  Pager,
  Pill,
  Section,
  Td,
  pageFrom,
  textFrom,
  when,
} from "@/features/admin/components/ui";

export const metadata: Metadata = { title: "Emails" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  invitation: "Invitations",
  reminder: "Reminders",
  confirmation: "Reply confirmations",
};

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = textFrom(sp.filter, 20);
  const filter: EmailFilter = (EMAIL_FILTERS as readonly string[]).includes(raw)
    ? (raw as EmailFilter)
    : "all";
  const page = pageFrom(sp.page);
  const { total, rows, last30 } = await listEmails(filter, page);

  return (
    <>
      <PageTitle
        title="Emails"
        sub="Emails Àríyá sent to guests, newest first."
      />

      <Section title="Last 30 days by kind" className="mt-0">
        <DataTable
          head={["Kind", "Sent", "Failed"]}
          rows={last30.length}
          empty="No emails in the last 30 days."
        >
          {last30.map((t) => (
            <tr key={t.type}>
              <Td>{TYPE_LABELS[t.type] ?? t.type}</Td>
              <Td className="tabular-nums">{t.sent}</Td>
              <Td className="tabular-nums">
                {t.failed > 0 ? <Pill tone="bad">{t.failed}</Pill> : 0}
              </Td>
            </tr>
          ))}
        </DataTable>
      </Section>

      <Section title="Every email">
        <nav aria-label="Filter" className="mb-3 flex flex-wrap gap-1.5">
          {EMAIL_FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/admin/emails" : `/admin/emails?filter=${f}`}
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
        </nav>
        <DataTable
          head={["To", "Subject", "Celebration", "Status", "Sent"]}
          rows={rows.length}
          empty="No emails here."
        >
          {rows.map((e) => (
            <tr key={e.id}>
              <Td>{e.recipient_email}</Td>
              <Td>
                {e.subject}
                <span className="block text-xs text-label-2">
                  {TYPE_LABELS[e.template_type] ?? e.template_type}
                </span>
              </Td>
              <Td>
                <Link
                  className="text-burgundy hover:underline"
                  href={`/admin/events/${e.event_id}`}
                >
                  {e.event?.title ?? "—"}
                </Link>
              </Td>
              <Td>
                {e.status === "sent" ? (
                  <Pill tone="good">sent</Pill>
                ) : (
                  <Pill tone="bad">{e.status}</Pill>
                )}
              </Td>
              <Td>{when(e.sent_at)}</Td>
            </tr>
          ))}
        </DataTable>
        <Pager
          path="/admin/emails"
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          params={{ filter: filter === "all" ? undefined : filter }}
        />
      </Section>
    </>
  );
}
