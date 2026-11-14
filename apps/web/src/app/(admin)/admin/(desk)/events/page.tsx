import Link from "next/link";
import type { Metadata } from "next";
import {
  EVENT_FILTERS,
  PAGE_SIZE,
  listEvents,
  type EventFilter,
} from "@/features/admin/queries";
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

export const metadata: Metadata = { title: "Celebrations" };
export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = textFrom(sp.q);
  const raw = textFrom(sp.filter, 20);
  const filter: EventFilter = (EVENT_FILTERS as readonly string[]).includes(raw)
    ? (raw as EventFilter)
    : "all";
  const page = pageFrom(sp.page);
  const { total, rows } = await listEvents(q, filter, page);

  return (
    <>
      <PageTitle title="Celebrations" sub="Every celebration, newest first." />
      <Notice text={textFrom(sp.notice, 300)} />
      <SearchBar
        action="/admin/events"
        query={q}
        placeholder="Search by name, couple or page address"
        filters={EVENT_FILTERS}
        filter={filter}
      />
      <DataTable
        head={["Celebration", "Owner", "Date", "Invited", "Accepted", "Pass"]}
        rows={rows.length}
        empty="No celebration matches."
      >
        {rows.map((e) => (
          <tr key={e.id}>
            <Td>
              <Link
                className="font-semibold text-burgundy hover:underline"
                href={`/admin/events/${e.id}`}
              >
                {e.title}
              </Link>
              <span className="block text-xs text-label-2">{e.couple}</span>
            </Td>
            <Td>{e.owner_email ?? "—"}</Td>
            <Td>
              {when(e.date, false)}
              <span className="mt-1 flex gap-1">
                {e.status === "archived" && <Pill>Archived</Pill>}
                {e.ended && <Pill>Ended</Pill>}
              </span>
            </Td>
            <Td className="tabular-nums">
              {e.invited} / {e.guests}
            </Td>
            <Td className="tabular-nums">{e.accepted}</Td>
            <Td>
              {e.paid_at ? <Pill tone="good">Paid</Pill> : <Pill>Free</Pill>}
            </Td>
          </tr>
        ))}
      </DataTable>
      <Pager
        path="/admin/events"
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        params={{ q, filter: filter === "all" ? undefined : filter }}
      />
    </>
  );
}
