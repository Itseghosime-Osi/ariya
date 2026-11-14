import type { Metadata } from "next";
import { getHealth } from "@/features/admin/queries";
import { PageTitle, Pill, Section, when } from "@/features/admin/components/ui";

export const metadata: Metadata = { title: "Health" };
export const dynamic = "force-dynamic";

function hoursSince(iso: string | null) {
  return iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : Infinity;
}

function Row({
  label,
  value,
  ok,
  note,
}: {
  label: string;
  value: string;
  ok: boolean | null;
  note: string;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 max-w-prose">
        <p className="font-semibold text-night">{label}</p>
        <p className="mt-0.5 text-[13px] text-label-2">{note}</p>
      </div>
      <div className="flex items-center gap-2 text-sm tabular-nums">
        {value}
        {ok === null ? (
          <Pill>No data yet</Pill>
        ) : ok ? (
          <Pill tone="good">OK</Pill>
        ) : (
          <Pill tone="warn">Look</Pill>
        )}
      </div>
    </li>
  );
}

export default async function AdminHealthPage() {
  const h = await getHealth();
  const reminderHours = hoursSince(h.last_reminder_email);
  const digestHours = hoursSince(h.last_digest);

  return (
    <>
      <PageTitle
        title="Health"
        sub="Whether the scheduled jobs and the busy parts of Àríyá are working."
      />
      <Section title="Scheduled jobs" className="mt-0">
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-white/60">
          <Row
            label="Daily reply reminders"
            value={when(h.last_reminder_email)}
            ok={h.last_reminder_email ? reminderHours < 72 : null}
            note={`Runs every morning, emailing guests who have not replied in the two weeks before a celebration. ${h.reminders_7d} sent this week. A quiet spell is normal when no celebration is that close.`}
          />
          <Row
            label="Monday checklist digest"
            value={when(h.last_digest)}
            ok={h.last_digest ? digestHours < 24 * 8 : null}
            note={`Sent weekly to hosts. ${h.digests_7d} this week.`}
          />
        </ul>
      </Section>
      <Section title="Last 7 days">
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-white/60">
          <Row
            label="Emails that failed"
            value={String(h.emails_failed_7d)}
            ok={h.emails_failed_7d === 0}
            note="See Emails for who and why."
          />
          <Row
            label="Invitation designer errors"
            value={String(h.studio_errors_7d)}
            ok={h.studio_errors_7d <= Math.max(2, h.studio_exports_7d * 0.05)}
            note={`Errors and failed exports, against ${h.studio_exports_7d} successful exports.`}
          />
          <Row
            label="Payments stuck on pending"
            value={String(h.payments_pending_over_1h)}
            ok={h.payments_pending_over_1h === 0}
            note="Older than an hour (last 30 days). Open each in Payments and re-check it with Paystack."
          />
          <Row
            label="AI app errors"
            value={String(h.ai_errors_7d)}
            ok={h.ai_errors_7d <= Math.max(3, h.ai_calls_7d * 0.1)}
            note={`Out of ${h.ai_calls_7d} calls from connected apps.`}
          />
        </ul>
      </Section>
    </>
  );
}
