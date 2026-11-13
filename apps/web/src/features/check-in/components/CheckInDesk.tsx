"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckInHeader } from "./CheckInHeader";
import { CheckInCameraScanner } from "./CheckInCameraScanner";
import { GuestNameSearch } from "./GuestNameSearch";
import { ManualCheckInForm } from "./ManualCheckInForm";
import { CheckInResultCard } from "./CheckInResultCard";
import { CheckInVerifyCard } from "./CheckInVerifyCard";
import { RecentCheckInsList } from "./RecentCheckInsList";
import { OfflineStatus } from "./OfflineStatus";
import { useOfflineDesk } from "../useOfflineDesk";
import { offlineStats } from "../offline";
import type {
  CheckInDeskData,
  CheckInResult,
  RecentCheckIn,
  CheckInStats,
} from "../types";

interface CheckInDeskProps {
  eventId: string;
  initialData: CheckInDeskData;
}

export function CheckInDesk({ eventId, initialData }: CheckInDeskProps) {
  const router = useRouter();
  const [stats, setStats] = useState<CheckInStats>(initialData.stats);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>(
    initialData.recentCheckIns
  );
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [pending, setPending] = useState<{
    code: string;
    result: CheckInResult;
  } | null>(null);
  const [admittedAt, setAdmittedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  // Online when it can be, from this phone's copy of the guest list when it cannot.
  const desk = useOfflineDesk(eventId, () => router.refresh());
  // The realtime handler below is set up once; it reads the desk through this ref.
  const deskRef = React.useRef(desk);
  deskRef.current = desk;

  // Subscribe to Supabase Realtime for check_ins
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`check_ins_${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "check_ins",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const newRow = payload.new as {
            id: string;
            checked_in_count: number;
            checked_in_at: string;
          };
          const count = newRow.checked_in_count || 1;

          // With the guest list on this phone, its copy is the one count: refresh it rather than
          // adding here, or this phone's own admissions would be counted twice.
          if (deskRef.current.snapshot) {
            deskRef.current.refreshSoon();
            return;
          }
          setStats((prev) => {
            const nextChecked = prev.checkedIn + count;
            const nextRemaining = Math.max(0, prev.totalExpected - nextChecked);
            const nextRate =
              prev.totalExpected > 0
                ? Math.min(
                    100,
                    Math.round((nextChecked / prev.totalExpected) * 100)
                  )
                : 0;

            return {
              ...prev,
              checkedIn: nextChecked,
              remaining: nextRemaining,
              attendanceRate: nextRate,
            };
          });
        }
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Step one: look the pass up. Nobody is admitted until the door staff taps Admit.
  const handleVerify = async (code: string) => {
    setLoading(true);
    setResult(null);
    setPending(null);
    const looked = await desk.verify(code);
    setLoading(false);

    if (looked.status === "verified") {
      setPending({ code, result: looked });
      return;
    }
    setResult(looked);
  };

  const handleProcessCheckIn = async (code: string, count: number) => {
    setLoading(true);
    setResult(null);
    setPending(null);

    const { result: admitted, offline } = await desk.admit(code, count);
    setLoading(false);

    setResult(admitted);

    if (admitted.status === "checked_in") {
      setAdmittedAt(new Date().toISOString());
      const admittedCount = admitted.admitted_now || count;
      // Only without a saved list: otherwise the list's copy already moved.
      if (!desk.snapshot)
        setStats((prev) => {
          const nextChecked = prev.checkedIn + admittedCount;
          const nextRemaining = Math.max(0, prev.totalExpected - nextChecked);
          const nextRate =
            prev.totalExpected > 0
              ? Math.min(
                  100,
                  Math.round((nextChecked / prev.totalExpected) * 100)
                )
              : 0;

          return {
            ...prev,
            checkedIn: nextChecked,
            remaining: nextRemaining,
            attendanceRate: nextRate,
          };
        });

      const newEntry: RecentCheckIn = {
        id: `local-${Date.now()}`,
        guest_name: admitted.guest_name || "Honoured Guest",
        count: admittedCount,
        checked_in_at: new Date().toISOString(),
        table_name: admitted.table_name || null,
        waiting: offline,
      };
      setRecentCheckIns((prev) => [newEntry, ...prev.slice(0, 19)]);
      if (!offline) router.refresh();
    }
  };

  // Without a signal, or with admissions still to send, the numbers come from this phone's copy.
  // With the guest list on this phone, the numbers come from it (plus anything waiting to send).
  const shownStats = desk.snapshot
    ? offlineStats(desk.snapshot, desk.queue)
    : stats;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24 sm:space-y-6 sm:pb-8">
      <CheckInHeader
        eventId={eventId}
        stats={shownStats}
        isRealtimeActive={isRealtimeActive && desk.online}
        offline={!desk.online}
      />

      <OfflineStatus
        online={desk.online}
        snapshot={desk.snapshot}
        queue={desk.queue}
        syncing={desk.syncing}
        outcomes={desk.outcomes}
        onDismissOutcomes={desk.dismissOutcomes}
      />

      {pending && (
        <CheckInVerifyCard
          result={pending.result}
          loading={loading}
          onAdmit={(count) => handleProcessCheckIn(pending.code, count)}
          onCancel={() => setPending(null)}
        />
      )}

      <CheckInResultCard
        result={result}
        admittedAt={admittedAt}
        onDismiss={() => setResult(null)}
      />

      <div className="grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <GuestNameSearch
            eventId={eventId}
            search={desk.search}
            disabled={loading}
            onPick={(code) => handleVerify(code)}
          />

          <ManualCheckInForm
            loading={loading}
            onCheckIn={(code) => handleVerify(code)}
          />

          <CheckInCameraScanner
            disabled={loading}
            onScan={(code) => handleVerify(code)}
          />
        </div>

        <div className="lg:col-span-5 sticky top-6">
          <RecentCheckInsList checkIns={recentCheckIns} />
        </div>
      </div>
    </div>
  );
}
