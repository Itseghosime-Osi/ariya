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
import { performCheckInAction, verifyCheckInAction } from "../actions";
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
    const res = await verifyCheckInAction(eventId, code);
    setLoading(false);

    if (!res.ok || !res.result) {
      setResult({
        status: "unknown_code",
        message: res.error || "Could not verify that pass",
      });
      return;
    }
    if (res.result.status === "verified") {
      setPending({ code, result: res.result });
      return;
    }
    setResult(res.result);
  };

  const handleProcessCheckIn = async (code: string, count: number) => {
    setLoading(true);
    setResult(null);
    setPending(null);

    const res = await performCheckInAction(eventId, { code, count });
    setLoading(false);

    if (!res.ok || !res.result) {
      setResult({
        status: "unknown_code",
        message: res.error || "Failed to process check-in",
      });
      return;
    }

    setResult(res.result);

    if (res.result.status === "checked_in") {
      setAdmittedAt(new Date().toISOString());
      const admittedCount = res.result.admitted_now || count;
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
        guest_name: res.result.guest_name || "Honoured Guest",
        count: admittedCount,
        checked_in_at: new Date().toISOString(),
        table_name: res.result.table_name || null,
      };
      setRecentCheckIns((prev) => [newEntry, ...prev.slice(0, 19)]);
      router.refresh();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24 sm:space-y-6 sm:pb-8">
      <CheckInHeader
        eventId={eventId}
        stats={stats}
        isRealtimeActive={isRealtimeActive}
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
