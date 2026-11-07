"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { BackLink } from "@/components/layout/back-link";
import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableListView } from "./TableListView";
import { TableFormModal } from "./TableFormModal";
import { useSeatingDesk } from "./useSeatingDesk";
import { HallStudio } from "../hall/HallStudio";
import type { SeatingDeskData } from "../types";

interface SeatingDeskProps {
  eventId: string;
  /** The event's name, shown beside the Back button. */
  eventTitle?: string;
  initialData: SeatingDeskData;
  hallLayout?: unknown;
  hallLayoutAvailable?: boolean;
  /** The event date, so the risk register can turn "3 weeks before" into a real day. */
  eventDate?: string | null;
  /** Risk rules that already have a checklist task, so the button does not offer them twice. */
  addedRiskIds?: string[];
}

export function SeatingDesk({
  eventId,
  eventTitle,
  initialData,
  hallLayout = null,
  hallLayoutAvailable = false,
  eventDate = null,
  addedRiskIds = [],
}: SeatingDeskProps) {
  // The hall studio is for tablets and laptops; phones get the table list, which suits them. On a
  // laptop the list is a tab in the studio's left dock, so there is no separate list view there.
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const view = phone ? "list" : "hall";

  const {
    addTables,
    updateTable,
    setTablePositions,
    bulkAssign,
    data,
    errorMsg,
    successMsg,
    isModalOpen,
    setIsModalOpen,
    editingTable,
    setEditingTable,
    executeSeatChange,
    handleSaveTable,
    handleDeleteTable,
    pendingDelete,
    cancelDelete,
    confirmDelete,
    deleteTables,
  } = useSeatingDesk(eventId, initialData);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // The guest being dragged is drawn in an overlay above the page, so no scrolling list clips it.
  const [dragging, setDragging] = useState<string | null>(null);
  const draggedGuest = dragging
    ? (data.unseatedGuests.find((g) => g.id === dragging) ??
      data.tables.flatMap((t) => t.guests).find((g) => g.id === dragging))
    : undefined;
  const handleDragStart = (event: DragStartEvent) =>
    setDragging(String(event.active.id));
  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;
    executeSeatChange(String(active.id), String(over.id));
  };

  const openNewTable = () => {
    setEditingTable(null);
    setIsModalOpen(true);
  };

  // The studio is a workspace: it fills the screen and the page does not scroll. The list is an
  // ordinary page that scrolls.
  useLayoutEffect(() => {
    if (view !== "hall") return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    // Hidden overflow still lets the page be scrolled by code or by focusing a control near the
    // bottom; keep it pinned so the workspace never shifts.
    const pin = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };
    window.addEventListener("scroll", pin, { passive: true });
    return () => {
      window.removeEventListener("scroll", pin);
      html.style.overflow = prev;
    };
  }, [view]);

  const notice = errorMsg ? (
    <span className="inline-flex items-center gap-2 text-[#9e2a2b]">
      <CircleAlert size={15} /> {errorMsg}
    </span>
  ) : successMsg ? (
    <span className="inline-flex items-center gap-2 text-[#1f6b4a]">
      <CircleCheck size={15} /> {successMsg}
    </span>
  ) : null;

  const deleting = data.tables.find((t) => t.id === pendingDelete);

  const iconLink =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-night hover:bg-[#f1ece4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

  return (
    <DndContext
      id="seating-desk"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div
        data-seating-frame
        className={cn(
          "relative z-10 flex flex-col",
          view === "hall" ? "h-dvh" : "min-h-dvh bg-ivory"
        )}
      >
        {view === "list" && (
          // On a phone there is no studio: the list is the page, so it brings its own Back and heading.
          <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-hairline bg-ivory/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
            <BackLink
              href={`/events/${eventId}`}
              aria-label="Back"
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-night px-4 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back
            </BackLink>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-[15px] font-bold leading-tight text-night">
                Seating &amp; Floor Plan
              </h1>
              <p className="truncate text-[11px] leading-tight text-label-2">
                {[eventTitle, `${data.stats.readinessPct}% seated`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Link
              href={`/events/${eventId}/seating/print`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Print cards and chart"
              title="Print cards and chart"
              className={iconLink}
            >
              <Printer size={17} />
            </Link>
            <button
              type="button"
              onClick={openNewTable}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-burgundy px-3 text-xs font-semibold text-ivory hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <Plus size={15} />
              <span className="max-sm:sr-only">New Table</span>
            </button>
          </header>
        )}

        {view === "hall" ? (
          <HallStudio
            eventId={eventId}
            data={data}
            initialLayout={hallLayout}
            layoutAvailable={hallLayoutAvailable}
            eventDate={eventDate}
            addedRiskIds={addedRiskIds}
            addTables={addTables}
            updateTable={updateTable}
            setTablePositions={setTablePositions}
            bulkAssign={bulkAssign}
            onAssignTable={(guestId, tableId) =>
              executeSeatChange(guestId, tableId)
            }
            onDeleteTable={handleDeleteTable}
            deleteTables={deleteTables}
            notice={notice}
            eventTitle={eventTitle}
            backHref={`/events/${eventId}`}
            onNewTable={openNewTable}
          />
        ) : (
          <div className="px-3 pb-24 pt-3">
            {notice && (
              <p
                role="status"
                className="mb-4 rounded-2xl border border-hairline bg-white px-4 py-2.5 text-xs font-semibold"
              >
                {notice}
              </p>
            )}
            <TableListView
              data={data}
              onAddTable={openNewTable}
              onAssign={executeSeatChange}
              onEditTable={(t) => {
                setEditingTable(t);
                setIsModalOpen(true);
              }}
              onDeleteTable={handleDeleteTable}
            />
          </div>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && cancelDelete()}
      >
        <DialogContent className="max-w-md rounded-[24px] bg-white">
          <DialogHeader>
            <span className="mb-2 grid h-11 w-11 place-items-center rounded-full bg-[#fbe9ea] text-[#9e2a2b]">
              <Trash2 size={19} />
            </span>
            <DialogTitle className="font-display text-xl text-night">
              Delete {deleting?.name ?? "this table"}?
            </DialogTitle>
            <DialogDescription className="text-sm text-label-2">
              {deleting && deleting.guests.length > 0
                ? `${deleting.guests.length} ${deleting.guests.length === 1 ? "guest" : "guests"} seated here will go back to Waiting for a seat.`
                : "Nobody is seated here yet."}{" "}
              You can add the table again at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={cancelDelete}
              className="min-h-11 rounded-full border border-hairline bg-white px-5 text-xs font-semibold text-night hover:border-night/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="min-h-11 rounded-full bg-[#9e2a2b] px-5 text-xs font-semibold text-white hover:bg-[#82211f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              Delete table
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TableFormModal
        isOpen={isModalOpen}
        initialTable={editingTable}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveTable}
      />
      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={null} zIndex={80}>
            {draggedGuest ? (
              <div className="inline-flex cursor-grabbing items-center gap-2 rounded-full border border-burgundy/30 bg-white py-1.5 pl-1.5 pr-3.5 text-sm font-semibold text-night shadow-[0_18px_40px_-14px_rgba(28,7,13,0.55)]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-burgundy text-[11px] font-bold text-white">
                  {draggedGuest.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                {draggedGuest.name}
                {draggedGuest.attending_count > 1 && (
                  <span className="rounded-full bg-[#f3ead8] px-1.5 text-[11px] text-[#5c4013]">
                    +{draggedGuest.attending_count - 1}
                  </span>
                )}
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}
