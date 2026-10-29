"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GuestWithDetails,
  GuestFilterState,
  GuestOverviewStats,
} from "../types";
import { GuestRegistryHeader } from "./GuestRegistryHeader";
import { GuestRegistryMetrics } from "./GuestRegistryMetrics";
import { GuestRegistryFilters } from "./GuestRegistryFilters";
import { GuestLedger } from "./GuestLedger";
import { GuestDetailDrawer } from "./GuestDetailDrawer";
import { GuestFormModal } from "./GuestFormModal";
import { DeleteGuestDialog } from "./DeleteGuestDialog";
import { CsvImportModal } from "./import/CsvImportModal";
import { deleteGuestAction } from "../actions";

interface GuestRegistryViewProps {
  eventId: string;
  eventName: string;
  initialGuests: GuestWithDetails[];
  totalGuests: number;
  stats: GuestOverviewStats;
  availableGroups: string[];
  initialPage: number;
  initialPageSize: number;
  initialFilters: GuestFilterState;
}

export function GuestRegistryView({
  eventId,
  eventName,
  initialGuests,
  totalGuests,
  stats,
  availableGroups,
  initialPage,
  initialPageSize,
  initialFilters,
}: GuestRegistryViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedGuest, setSelectedGuest] =
    React.useState<GuestWithDetails | null>(null);
  const [guestToDelete, setGuestToDelete] =
    React.useState<GuestWithDetails | null>(null);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [router]);

  const updateQueryParams = (
    newFilters: GuestFilterState,
    newPage: number,
    newPageSize: number
  ) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    const setOrDelete = (key: string, val?: string | boolean | null) => {
      if (val !== undefined && val !== null && val !== "" && val !== "all") {
        params.set(key, String(val));
      } else {
        params.delete(key);
      }
    };

    setOrDelete("search", newFilters.search);
    setOrDelete("side", newFilters.side);
    setOrDelete("group", newFilters.group);
    setOrDelete("rsvpStatus", newFilters.rsvpStatus);
    setOrDelete("seatedStatus", newFilters.seatedStatus);
    setOrDelete("vip", newFilters.isVip);

    params.set("page", String(newPage));
    params.set("pageSize", String(newPageSize));
    router.push(`?${params.toString()}`);
  };

  const handleCopyLink = async (guest: GuestWithDetails) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await navigator.clipboard.writeText(`${origin}/i/${guest.rsvp_token}`);
  };

  const handleShareWhatsApp = (guest: GuestWithDetails) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/i/${guest.rsvp_token}`;
    const text = encodeURIComponent(
      `Hello ${guest.name}! You are cordially invited to celebrate with us at ${eventName}. Please RSVP here: ${inviteUrl}`
    );
    const url = guest.phone
      ? `https://wa.me/${guest.phone.replace(/[^0-9]/g, "")}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDeleteConfirm = async () => {
    if (!guestToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteGuestAction(guestToDelete.id, eventId);
      if (res.ok) {
        setGuestToDelete(null);
        if (selectedGuest?.id === guestToDelete.id) setSelectedGuest(null);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = {
    search: "",
    side: "all" as const,
    group: "all",
    rsvpStatus: "all" as const,
    seatedStatus: "all" as const,
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
      <GuestRegistryHeader
        eventName={eventName}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenAdd={() => setIsAddOpen(true)}
      />
      <GuestRegistryMetrics eventId={eventId} stats={stats} />
      <GuestRegistryFilters
        filters={initialFilters}
        stats={stats}
        availableGroups={availableGroups}
        onChange={(f) => updateQueryParams(f, 1, initialPageSize)}
        onReset={() => updateQueryParams(resetFilters, 1, initialPageSize)}
      />
      <GuestLedger
        guests={initialGuests}
        totalCount={totalGuests}
        page={initialPage}
        pageSize={initialPageSize}
        onPageChange={(p) =>
          updateQueryParams(initialFilters, p, initialPageSize)
        }
        onPageSizeChange={(ps) => updateQueryParams(initialFilters, 1, ps)}
        onSelectGuest={(g) => setSelectedGuest(g)}
        onCopyLink={handleCopyLink}
        onShareWhatsApp={handleShareWhatsApp}
      />
      <GuestDetailDrawer
        eventId={eventId}
        eventName={eventName}
        guest={selectedGuest}
        isOpen={Boolean(selectedGuest)}
        onClose={() => setSelectedGuest(null)}
        onGuestUpdated={(updated) => {
          setSelectedGuest(updated);
          router.refresh();
        }}
        onRequestDelete={(g) => setGuestToDelete(g)}
      />
      <GuestFormModal
        eventId={eventId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => router.refresh()}
      />
      <DeleteGuestDialog
        guest={guestToDelete}
        isOpen={Boolean(guestToDelete)}
        isDeleting={isDeleting}
        onClose={() => setGuestToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
      <CsvImportModal
        eventId={eventId}
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => router.refresh()}
      />
    </div>
  );
}
