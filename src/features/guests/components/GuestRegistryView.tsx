"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GuestWithDetails,
  GuestFilterState,
  GuestOverviewStats,
} from "../types";
import { GuestRegistryMetrics } from "./GuestRegistryMetrics";
import { GuestRegistryFilters } from "./GuestRegistryFilters";
import { GuestRegistryTable } from "./GuestRegistryTable";
import { GuestDetailDrawer } from "./GuestDetailDrawer";
import { GuestFormModal } from "./GuestFormModal";
import { DeleteGuestDialog } from "./DeleteGuestDialog";
import { CsvImportModal } from "./import/CsvImportModal";
import { Button } from "@/components/ui/button";
import { deleteGuestAction } from "../actions";
import { UserPlus, Upload, Sparkles } from "lucide-react";

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

  const updateQueryParams = (
    newFilters: GuestFilterState,
    newPage: number,
    newPageSize: number
  ) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (newFilters.search) params.set("search", newFilters.search);
    else params.delete("search");

    if (newFilters.side && newFilters.side !== "all")
      params.set("side", newFilters.side);
    else params.delete("side");

    if (newFilters.group && newFilters.group !== "all")
      params.set("group", newFilters.group);
    else params.delete("group");

    if (newFilters.rsvpStatus && newFilters.rsvpStatus !== "all")
      params.set("rsvpStatus", newFilters.rsvpStatus);
    else params.delete("rsvpStatus");

    if (newFilters.seatedStatus && newFilters.seatedStatus !== "all")
      params.set("seatedStatus", newFilters.seatedStatus);
    else params.delete("seatedStatus");

    if (newFilters.isVip !== undefined)
      params.set("vip", String(newFilters.isVip));
    else params.delete("vip");

    params.set("page", String(newPage));
    params.set("pageSize", String(newPageSize));

    router.push(`?${params.toString()}`);
  };

  const handleCopyLink = async (guest: GuestWithDetails) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await navigator.clipboard.writeText(`${origin}/rsvp/${guest.rsvp_token}`);
  };

  const handleShareWhatsApp = (guest: GuestWithDetails) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/rsvp/${guest.rsvp_token}`;
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

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-on-surface">
              Guest Registry
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-wine/10 text-wine">
              <Sparkles className="h-3 w-3" /> FINAL 03
            </span>
          </div>
          <p className="text-sm text-mist mt-1">
            Curate attendance, manage party sizes, and generate unique digital
            RSVP invitations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="border-outline-variant shadow-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="shadow-sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Guest
          </Button>
        </div>
      </div>

      <GuestRegistryMetrics stats={stats} />

      <GuestRegistryFilters
        filters={initialFilters}
        availableGroups={availableGroups}
        onChange={(newFilters) =>
          updateQueryParams(newFilters, 1, initialPageSize)
        }
        onReset={() =>
          updateQueryParams(
            {
              search: "",
              side: "all",
              group: "all",
              rsvpStatus: "all",
              seatedStatus: "all",
            },
            1,
            initialPageSize
          )
        }
      />

      <GuestRegistryTable
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
        existingGuests={initialGuests.map((g) => ({
          phone: g.phone,
          email: g.email,
          name: g.name,
        }))}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => router.refresh()}
      />
    </div>
  );
}
