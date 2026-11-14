import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getEvent, getEventGuests } from "@/features/admin/queries";
import { recordGuestListView } from "@/features/admin/actions";
import {
  DataTable,
  PageTitle,
  Pill,
  Td,
  textFrom,
  when,
} from "@/features/admin/components/ui";

export const metadata: Metadata = { title: "Guest list" };
export const dynamic = "force-dynamic";

/**
 * A celebration's guest list, behind a reason. The reason is asked in a plain GET form so the
 * page works without scripts; every time the list is shown, the visit is logged.
 */
export default async function AdminGuestListPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  if (!z.string().uuid().safeParse(eventId).success) notFound();
  const detail = await getEvent(eventId);
  if (!detail) notFound();
  const why = textFrom((await searchParams).why, 300);

  const back = (
    <p className="mb-2 text-sm">
      <Link
        href={`/admin/events/${eventId}`}
        className="text-label-2 hover:underline"
      >
        {detail.event.title}
      </Link>
    </p>
  );

  if (why.length < 3) {
    return (
      <>
        {back}
        <PageTitle
          title="Guest list"
          sub="Guests' details are private. Say why you need them."
        />
        <form
          className="flex max-w-lg flex-col gap-2"
          action={`/admin/events/${eventId}/guests`}
        >
          <label htmlFor="why" className="text-sm font-semibold">
            Why are you opening this guest list? (goes in the admin log)
          </label>
          <textarea
            id="why"
            name="why"
            required
            minLength={3}
            maxLength={300}
            rows={3}
            className="rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-burgundy"
          />
          <button
            type="submit"
            className="min-h-11 self-start rounded-xl bg-night px-4 text-sm font-semibold text-ivory hover:bg-wine"
          >
            Show the guest list
          </button>
        </form>
      </>
    );
  }

  await recordGuestListView(eventId, detail.event.title, why);
  const guests = await getEventGuests(eventId);

  return (
    <>
      {back}
      <PageTitle
        title="Guest list"
        sub={`${guests.length} guest parties. This visit is in the admin log.`}
      />
      <DataTable
        head={["Guest", "Contact", "Party", "Invited", "Reply"]}
        rows={guests.length}
        empty="No guests yet."
      >
        {guests.map((g) => {
          const reply = g.rsvps?.[0];
          return (
            <tr key={g.id}>
              <Td className="font-semibold">{g.name}</Td>
              <Td>
                {g.email ?? "—"}
                {g.phone && (
                  <span className="block text-xs text-label-2">{g.phone}</span>
                )}
              </Td>
              <Td className="tabular-nums">{g.party_size}</Td>
              <Td>{when(g.invited_at, false)}</Td>
              <Td>
                {reply?.status === "accepted" ? (
                  <Pill tone="good">
                    Coming ({reply.attending_count ?? g.party_size})
                  </Pill>
                ) : reply?.status === "declined" ? (
                  <Pill tone="bad">Declined</Pill>
                ) : (
                  <Pill>Awaiting</Pill>
                )}
              </Td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}
