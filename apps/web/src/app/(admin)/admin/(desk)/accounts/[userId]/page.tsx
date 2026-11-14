import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getAccount } from "@/features/admin/queries";
import { getAdminState } from "@/features/admin/guard";
import {
  deleteAccountAction,
  restoreAccountAction,
  signOutEverywhereAction,
  suspendAccountAction,
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

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AdminAccountPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  if (!z.string().uuid().safeParse(userId).success) notFound();
  const account = await getAccount(userId);
  if (!account) notFound();
  const state = await getAdminState();
  const self = state.kind === "admin" && state.admin.userId === userId;

  const { profile, auth } = account;
  const suspended = Boolean(
    auth?.banned_until && new Date(auth.banned_until) > new Date()
  );

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/accounts" className="text-label-2 hover:underline">
          Accounts
        </Link>
      </p>
      <PageTitle title={profile.full_name || profile.email} sub={profile.email}>
        <span className="flex flex-wrap gap-1">
          {account.isAdmin && <Pill tone="gold">Admin</Pill>}
          {suspended ? (
            <Pill tone="bad">Suspended</Pill>
          ) : (
            <Pill tone="good">Active</Pill>
          )}
          {auth && !auth.email_confirmed && (
            <Pill tone="warn">Email not confirmed</Pill>
          )}
        </span>
      </PageTitle>

      <StatGrid>
        <Stat label="Joined" value={when(profile.created_at, false)} />
        <Stat label="Last signed in" value={when(auth?.last_sign_in_at)} />
        <Stat
          label="Signs in with"
          value={auth?.provider === "google" ? "Google" : "Email and passcode"}
        />
        <Stat label="Phone" value={profile.phone || "—"} />
      </StatGrid>

      <Section title="Celebrations">
        <DataTable
          head={["Celebration", "Role", "Date", "Pass"]}
          rows={account.memberships.length}
          empty="Not part of any celebration."
        >
          {account.memberships.map((m) =>
            m.event ? (
              <tr key={m.event.id}>
                <Td>
                  <Link
                    className="font-semibold text-burgundy hover:underline"
                    href={`/admin/events/${m.event.id}`}
                  >
                    {m.event.title}
                  </Link>
                </Td>
                <Td className="capitalize">{m.role}</Td>
                <Td>{when(m.event.date, false)}</Td>
                <Td>
                  {m.event.paid_at ? (
                    <Pill tone="good">Paid</Pill>
                  ) : (
                    <Pill>Free</Pill>
                  )}
                </Td>
              </tr>
            ) : null
          )}
        </DataTable>
      </Section>

      <Section title="Payments">
        <DataTable
          head={["Reference", "Celebration", "Amount", "Status", "When"]}
          rows={account.payments.length}
          empty="No payments."
        >
          {account.payments.map((p) => (
            <tr key={p.id}>
              <Td>
                <Link
                  className="font-mono text-xs text-burgundy hover:underline"
                  href={`/admin/payments/${p.id}`}
                >
                  {p.paystack_reference}
                </Link>
              </Td>
              <Td>{p.event?.title ?? "—"}</Td>
              <Td className="tabular-nums">{naira(p.amount_kobo)}</Td>
              <Td>
                <Pill tone={paymentTone(p.status)}>{p.status}</Pill>
              </Td>
              <Td>{when(p.created_at)}</Td>
            </tr>
          ))}
        </DataTable>
      </Section>

      <Section title="AI connections">
        <DataTable
          head={["App", "Connected", "Last used", "Status"]}
          rows={account.connections.length}
          empty="No AI app connected."
        >
          {account.connections.map((c) => (
            <tr key={c.consent_id}>
              <Td>{c.client_name || "Unnamed app"}</Td>
              <Td>{when(c.granted_at)}</Td>
              <Td>{when(c.last_used_at)}</Td>
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

      <Section title="Actions">
        {self ? (
          <p className="text-sm text-label-2">
            This is your own account. Account actions are turned off here.
          </p>
        ) : (
          <div className="grid gap-3">
            <AdminAction
              label="Sign out everywhere"
              description="Ends every session on every device. Pages already open stop working within the hour."
              run={signOutEverywhereAction.bind(null, userId)}
            />
            {suspended ? (
              <AdminAction
                label="Restore account"
                description="Lets them sign in again."
                run={restoreAccountAction.bind(null, userId)}
              />
            ) : (
              <AdminAction
                label="Suspend account"
                description="Blocks sign-in and signs them out everywhere. Their celebrations, guests' invitations and pages keep working. Reversible."
                danger
                run={suspendAccountAction.bind(null, userId)}
              />
            )}
            <AdminAction
              label="Delete account"
              description="Permanently deletes the account, every celebration only they own (with its guests, replies and payments), and their place on shared celebrations. Cannot be undone."
              danger
              confirmPrompt="Type their email"
              confirmValue={profile.email}
              redirectTo="/admin/accounts"
              run={deleteAccountAction.bind(null, userId)}
            />
          </div>
        )}
      </Section>

      <Section title="Admin log for this account">
        <AuditList
          rows={account.log}
          empty="No admin has acted on this account."
        />
      </Section>
    </>
  );
}
