import type { AuditRow } from "../queries";
import { when } from "./ui";

const ACTION_LABELS: Record<string, string> = {
  grant_comp_pass: "Granted a complimentary pass",
  refund_payment: "Refunded a payment",
  recheck_payment: "Re-checked a payment with Paystack",
  delete_event: "Deleted a celebration",
  delete_account: "Deleted an account",
  suspend_account: "Suspended an account",
  restore_account: "Restored an account",
  sign_out_everywhere: "Signed an account out everywhere",
  disconnect_ai_app: "Disconnected an AI app",
  view_guest_list: "Opened a guest list",
};

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

export function AuditList({
  rows,
  empty,
}: {
  rows: AuditRow[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-hairline bg-white/30 p-6 text-center text-sm text-label-2">
        {empty}
      </p>
    );
  }
  return (
    <ol className="divide-y divide-hairline rounded-3xl adm-glass border border-hairline">
      {rows.map((r) => (
        <li key={r.id} className="px-4 py-3 text-sm">
          <p className="font-semibold text-night">
            {actionLabel(r.action)}
            {r.target_label && (
              <span className="font-normal text-label-2">
                : {r.target_label}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-label-2">
            {when(r.created_at)} · {r.admin_email}
          </p>
          {r.reason && (
            <p className="mt-1 text-[13px] text-night">“{r.reason}”</p>
          )}
        </li>
      ))}
    </ol>
  );
}
