import Link from "next/link";
import type { Metadata } from "next";
import { listAiConnections } from "@/features/admin/queries";
import { disconnectAiAppAction } from "@/features/admin/actions";
import { AdminAction } from "@/features/admin/components/AdminAction";
import {
  DataTable,
  PageTitle,
  Pill,
  Section,
  Stat,
  StatGrid,
  Td,
  when,
} from "@/features/admin/components/ui";
import { adm } from "@/features/admin/path";

export const metadata: Metadata = { title: "AI connections" };
export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const { rows, proposals30 } = await listAiConnections();
  const active = rows.filter((r) => !r.revoked_at);
  const calls = rows.reduce((s, r) => s + Number(r.calls_7d ?? 0), 0);

  return (
    <>
      <PageTitle
        title="AI connections"
        sub="Apps hosts have connected to their celebration desk."
      />
      <StatGrid>
        <Stat label="Connected now" value={active.length} />
        <Stat label="Calls (7 days)" value={calls} />
        {proposals30.map((p) => (
          <Stat
            key={p.status}
            label={`Proposals ${p.status} (30 days)`}
            value={p.n}
          />
        ))}
      </StatGrid>

      <Section title="Connections">
        <DataTable
          head={["App", "Account", "Connected", "Last used", "Status"]}
          rows={rows.length}
          empty="No AI app has been connected yet."
        >
          {rows.map((c) => (
            <tr key={c.consent_id}>
              <Td>
                {c.client_name || "Unnamed app"}
                <span
                  className="block max-w-[16rem] truncate text-xs text-label-2"
                  title={c.redirect_uris ?? ""}
                >
                  {c.redirect_uris}
                </span>
              </Td>
              <Td>
                <Link
                  className="text-burgundy hover:underline"
                  href={adm(`/admin/accounts/${c.user_id}`)}
                >
                  {c.user_email}
                </Link>
              </Td>
              <Td>{when(c.granted_at)}</Td>
              <Td>
                {when(c.last_used_at)}
                <span className="block text-xs text-label-2">
                  {c.calls_7d} calls this week
                </span>
              </Td>
              <Td>
                {c.revoked_at ? (
                  <Pill>Disconnected</Pill>
                ) : (
                  <Pill tone="good">Connected</Pill>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      </Section>

      {active.length > 0 && (
        <Section title="Disconnect an app">
          <div className="grid gap-3">
            {active.map((c) => (
              <AdminAction
                key={c.consent_id}
                label={`Disconnect ${c.client_name || "app"}`}
                description={`From ${c.user_email}. Its next call is refused; they can connect it again.`}
                danger
                run={disconnectAiAppAction.bind(null, c.consent_id)}
              />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
