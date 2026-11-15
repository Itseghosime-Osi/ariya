import Link from "next/link";
import type { Metadata } from "next";
import { PAGE_SIZE, listAudit } from "@/features/admin/queries";
import { actionLabel } from "@/features/admin/components/AuditList";
import {
  DataTable,
  PageTitle,
  Pager,
  Td,
  pageFrom,
  when,
} from "@/features/admin/components/ui";
import { adm } from "@/features/admin/path";

export const metadata: Metadata = { title: "Admin log" };
export const dynamic = "force-dynamic";

const TARGET_PATHS: Record<string, string> = {
  account: adm("/admin/accounts/"),
  event: adm("/admin/events/"),
  guest_list: adm("/admin/events/"),
  payment: adm("/admin/payments/"),
};

export default async function AdminLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = pageFrom((await searchParams).page);
  const { total, rows } = await listAudit(page);

  return (
    <>
      <PageTitle
        title="Admin log"
        sub="Every admin action and every guest list opened. It cannot be edited."
      />
      <DataTable
        head={["What", "When", "Admin", "Reason"]}
        rows={rows.length}
        empty="Nothing yet."
      >
        {rows.map((r) => {
          const path = TARGET_PATHS[r.target_type];
          const deleted =
            r.action === "delete_event" || r.action === "delete_account";
          return (
            <tr key={r.id}>
              <Td>
                <span className="font-semibold text-night">
                  {actionLabel(r.action)}
                </span>
                {r.target_label && (
                  <span className="block text-xs">
                    {path && r.target_id && !deleted ? (
                      <Link
                        className="text-burgundy hover:underline"
                        href={`${path}${r.target_id}`}
                      >
                        {r.target_label}
                      </Link>
                    ) : (
                      <span className="text-label-2">{r.target_label}</span>
                    )}
                  </span>
                )}
              </Td>
              <Td className="whitespace-nowrap">{when(r.created_at)}</Td>
              <Td wide>{r.admin_email}</Td>
              <Td wide className="sm:max-w-xs">
                {r.reason ? `“${r.reason}”` : "—"}
              </Td>
            </tr>
          );
        })}
      </DataTable>
      <Pager
        path={adm("/admin/log")}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}
