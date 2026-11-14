import Link from "next/link";
import type { Metadata } from "next";
import { PAGE_SIZE, listAccounts } from "@/features/admin/queries";
import {
  DataTable,
  Notice,
  PageTitle,
  Pager,
  Pill,
  SearchBar,
  Td,
  pageFrom,
  textFrom,
  when,
} from "@/features/admin/components/ui";

export const metadata: Metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = textFrom(sp.q);
  const page = pageFrom(sp.page);
  const { total, rows } = await listAccounts(q, page);

  return (
    <>
      <PageTitle
        title="Accounts"
        sub="Everyone who has signed up, newest first."
      />
      <Notice text={textFrom(sp.notice, 300)} />
      <SearchBar
        action="/admin/accounts"
        query={q}
        placeholder="Search by name or email"
      />
      <DataTable
        head={["Account", "Joined", "Last signed in", "Celebrations", "Status"]}
        rows={rows.length}
        empty={q ? `No account matches "${q}".` : "No accounts yet."}
      >
        {rows.map((a) => {
          const suspended =
            a.banned_until && new Date(a.banned_until) > new Date();
          return (
            <tr key={a.id}>
              <Td>
                <Link
                  className="font-semibold text-burgundy hover:underline"
                  href={`/admin/accounts/${a.id}`}
                >
                  {a.full_name || a.email}
                </Link>
                {a.full_name && (
                  <span className="block text-xs text-label-2">{a.email}</span>
                )}
              </Td>
              <Td>{when(a.created_at, false)}</Td>
              <Td>{when(a.last_sign_in_at)}</Td>
              <Td className="tabular-nums">{a.celebrations}</Td>
              <Td>
                <span className="flex flex-wrap gap-1">
                  {a.is_admin && <Pill tone="gold">Admin</Pill>}
                  {suspended ? (
                    <Pill tone="bad">Suspended</Pill>
                  ) : (
                    <Pill tone="good">Active</Pill>
                  )}
                  {a.provider === "google" && <Pill>Google</Pill>}
                </span>
              </Td>
            </tr>
          );
        })}
      </DataTable>
      <Pager
        path="/admin/accounts"
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        params={{ q }}
      />
    </>
  );
}
