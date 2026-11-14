import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getEvent } from "@/features/admin/queries";
import {
  deleteEventAction,
  grantCompPassAction,
} from "@/features/admin/actions";
import { AdminAction } from "@/features/admin/components/AdminAction";
import { AuditList } from "@/features/admin/components/AuditList";
import {
  DataTable,
  PageTitle,
  Pill,
  Section,
  Stat,
  StatGrid,
  Td,
  naira,
  paymentTone,
  when,
} from "@/features/admin/components/ui";
import { adm } from "@/features/admin/path";

export const metadata: Metadata = { title: "Celebration" };
export const dynamic = "force-dynamic";

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  if (!z.string().uuid().safeParse(eventId).success) notFound();
  const detail = await getEvent(eventId);
  if (!detail) notFound();
  const { event, counts } = detail;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link
          href={adm("/admin/events")}
          className="text-label-2 hover:underline"
        >
          Celebrations
        </Link>
      </p>
      <PageTitle
        title={event.title}
        sub={`${event.couple} · ${when(event.date, false)} · ${event.venue}`}
      >
        <span className="flex flex-wrap gap-1">
          {event.paid_at ? <Pill tone="good">Paid</Pill> : <Pill>Free</Pill>}
          {event.status === "archived" && <Pill>Archived</Pill>}
          {detail.ended && <Pill>Ended</Pill>}
          {event.is_public && <Pill tone="gold">Public page</Pill>}
          {event.invitation_live === false && (
            <Pill tone="warn">Test mode</Pill>
          )}
        </span>
      </PageTitle>

      <StatGrid>
        <Stat
          label="Guests"
          value={counts.guests}
          hint={`${counts.invited} invited`}
        />
        <Stat
          label="Replies"
          value={counts.accepted + counts.declined}
          hint={`${counts.accepted} accepted · ${counts.declined} declined`}
        />
        <Stat
          label="Seated"
          value={counts.seated}
          hint={`${counts.tables} tables`}
        />
        <Stat
          label="Checked in"
          value={counts.checkedIn}
          hint={`${counts.emails} emails sent`}
        />
      </StatGrid>

      <Section title="Team">
        <DataTable
          head={["Person", "Role"]}
          rows={detail.team.length}
          empty="No team."
        >
          {detail.team.map((m) => (
            <tr key={m.user_id}>
              <Td>
                <Link
                  className="text-burgundy hover:underline"
                  href={adm(`/admin/accounts/${m.user_id}`)}
                >
                  {m.email ?? m.user_id}
                </Link>
              </Td>
              <Td className="capitalize">{m.role}</Td>
            </tr>
          ))}
        </DataTable>
      </Section>

      <Section title="Payments">
        <DataTable
          head={["Reference", "Amount", "Status", "When"]}
          rows={detail.payments.length}
          empty="No payments."
        >
          {detail.payments.map((p) => (
            <tr key={p.id}>
              <Td>
                <Link
                  className="font-mono text-xs text-burgundy hover:underline"
                  href={adm(`/admin/payments/${p.id}`)}
                >
                  {p.paystack_reference}
                </Link>
              </Td>
              <Td className="tabular-nums">{naira(p.amount_kobo)}</Td>
              <Td>
                <Pill tone={paymentTone(p.status)}>{p.status}</Pill>
              </Td>
              <Td>{when(p.created_at)}</Td>
            </tr>
          ))}
        </DataTable>
      </Section>

      <Section title="Guest list">
        <p className="adm-glass rounded-3xl border border-hairline px-4 py-3 text-sm text-label-2">
          Guests&rsquo; names, emails and phone numbers are private. Opening the
          list asks why, and the visit is written to the admin log.{" "}
          <Link
            className="font-semibold text-burgundy hover:underline"
            href={adm(`/admin/events/${event.id}/guests`)}
          >
            Open the guest list
          </Link>
        </p>
      </Section>

      <Section title="Actions">
        <div className="grid gap-3">
          {!event.paid_at && (
            <AdminAction
              label="Grant a complimentary pass"
              description="Unlocks unlimited invitations for this celebration at no charge. Recorded as a ₦0 payment with an invoice."
              run={grantCompPassAction.bind(null, event.id)}
            />
          )}
          <AdminAction
            label="Delete celebration"
            description="Permanently deletes this celebration with its guests, replies, seating, payments and pages. Guests' links stop working. Cannot be undone."
            danger
            confirmPrompt="Type the celebration's name"
            confirmValue={event.title}
            redirectTo={adm("/admin/events")}
            run={deleteEventAction.bind(null, event.id)}
          />
        </div>
      </Section>

      <Section title="Admin log for this celebration">
        <AuditList
          rows={detail.log}
          empty="No admin has acted on this celebration."
        />
      </Section>
    </>
  );
}
