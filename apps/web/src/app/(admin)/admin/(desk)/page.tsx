import Link from "next/link";
import { getOverview } from "@/features/admin/queries";
import {
  DataTable,
  PageTitle,
  Section,
  Stat,
  StatGrid,
  Td,
  naira,
  when,
} from "@/features/admin/components/ui";
import { adm } from "@/features/admin/path";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const o = await getOverview();
  const conversion =
    o.conversion.sending_events > 0
      ? Math.round(
          (o.conversion.paid_sending_events / o.conversion.sending_events) * 100
        )
      : 0;

  return (
    <>
      <PageTitle
        title="Overview"
        sub="Àríyá at a glance. Times are Lagos time."
      />

      <Section title="Growth" className="mt-0">
        <StatGrid>
          <Stat
            label="Accounts"
            value={o.accounts.total}
            hint={`${o.accounts.d1} today · ${o.accounts.d7} this week`}
          />
          <Stat
            label="New accounts"
            hint="last 30 days"
            value={o.accounts.d30}
          />
          <Stat
            label="Celebrations"
            value={o.events.total}
            hint={`${o.events.upcoming} upcoming`}
          />
          <Stat
            label="New celebrations"
            value={o.events.d30}
            hint={`${o.events.d7} this week`}
          />
        </StatGrid>
      </Section>

      <Section title="Activity">
        <StatGrid>
          <Stat label="Invites today" value={o.invitations.d1} />
          <Stat
            label="Invites this week"
            value={o.invitations.d7}
            hint={`${o.invitations.d30.toLocaleString("en-NG")} in 30 days`}
          />
          <Stat
            label="Replies this week"
            value={o.replies.d7}
            hint={`${o.replies.d30.toLocaleString("en-NG")} in 30 days`}
          />
          <Stat
            label="Checked in this week"
            value={o.checkins.d7}
            hint={`${o.checkins.d30.toLocaleString("en-NG")} in 30 days`}
          />
        </StatGrid>
      </Section>

      <Section title="Money">
        <StatGrid>
          <Stat label="Revenue this month" value={naira(o.revenue.d30_kobo)} />
          <Stat label="Revenue, all time" value={naira(o.revenue.total_kobo)} />
          <Stat
            label="Paid celebrations"
            value={o.revenue.paid_events}
            hint={`${o.revenue.complimentary} complimentary · ${o.revenue.refunded} refunded`}
          />
          <Stat
            label="Free to paid"
            value={`${conversion}%`}
            hint={`${o.conversion.paid_sending_events} of ${o.conversion.sending_events} sending invitations paid`}
          />
        </StatGrid>
      </Section>

      <Section title={`Close to the free limit (${o.free_limit} invitations)`}>
        <DataTable
          head={["Celebration", "Owner", "Date", "Invited"]}
          rows={o.near_limit.length}
          empty="No free celebration is close to the limit right now."
        >
          {o.near_limit.map((e) => (
            <tr key={e.id}>
              <Td>
                <Link
                  className="font-semibold text-burgundy hover:underline"
                  href={adm(`/admin/events/${e.id}`)}
                >
                  {e.title}
                </Link>
              </Td>
              <Td>{e.owner_email ?? "—"}</Td>
              <Td>{when(e.date, false)}</Td>
              <Td className="tabular-nums">
                {e.invited} of {o.free_limit}
              </Td>
            </tr>
          ))}
        </DataTable>
      </Section>
    </>
  );
}
