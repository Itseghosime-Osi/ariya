"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  LayoutGrid,
  List,
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
import { cn } from "@/lib/utils";
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
  initialData: SeatingDeskData;
  hallLayout?: unknown;
  hallLayoutAvailable?: boolean;
}

const VIEW_KEY = "ariya:seating-view";

function ViewSwitch({
  view,
  onChange,
  compact,
}: {
  view: "hall" | "list";
  onChange: (v: "hall" | "list") => void;
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Seating view"
      className="inline-flex rounded-full border border-hairline bg-white p-1"
    >
      {(
        [
          ["hall", "Hall studio", LayoutGrid],
          ["list", "Table list", List],
        ] as const
      ).map(([key, label, I]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={view === key}
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
            compact ? "min-h-9" : "min-h-10",
            view === key
              ? "bg-burgundy text-ivory"
              : "text-label-2 hover:bg-burgundy/10"
          )}
        >
          <I size={14} />{" "}
          <span className={cn(compact && "max-sm:sr-only")}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function SeatingDesk({
  eventId,
  initialData,
  hallLayout = null,
  hallLayoutAvailable = false,
}: SeatingDeskProps) {
  // The hall studio is for tablets and laptops; phones get the table list, which suits them.
  const [chosen, setView] = useState<"hall" | "list">("hall");
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "hall" || saved === "list") setView(saved);
    } catch {
      /* no storage */
    }
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const view = phone ? "list" : chosen;
  const chooseView = (v: "hall" | "list") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* not remembered */
    }
  };

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

  // Both views live in one frame that fills the space between the app's bars, so switching
  // between the studio and the list only swaps what is inside it. The page itself does not scroll.
  const frame = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    const fit = () => {
      const el = frame.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const phone = window.matchMedia("(max-width: 767px)").matches;
      // On phones the bottom dock covers the last stretch of the screen.
      const gap = phone ? 156 : 24;
      setHeight(Math.max(420, window.innerHeight - top - gap));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      html.style.overflow = prev;
    };
  }, []);

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
        ref={frame}
        style={height ? { height } : undefined}
        data-seating-frame
        className="flex h-[calc(100dvh-10rem)] min-h-[420px] flex-col overflow-hidden"
      >
        <header className="flex h-14 shrink-0 items-center gap-1.5 pb-2 sm:gap-2">
          <h1 className="truncate font-display text-lg font-bold text-night">
            Seating &amp; Floor Plan
          </h1>
          <span className="hidden whitespace-nowrap rounded-full bg-[#f6f1e8] px-2.5 py-1 text-[11px] font-semibold text-burgundy lg:inline">
            {data.stats.readinessPct}% seated
            <span className="font-normal text-label-2">
              {" "}
              · {data.stats.seatedAttendees} of{" "}
              {data.stats.seatedAttendees + data.stats.unseatedAttendees}
            </span>
          </span>
          <div className="mx-auto">
            {!phone && <ViewSwitch view={view} onChange={chooseView} compact />}
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
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-burgundy px-4 text-xs font-semibold text-ivory hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Plus size={15} />
            <span className="max-sm:sr-only">New Table</span>
          </button>
        </header>

        {view === "hall" ? (
          <HallStudio
            eventId={eventId}
            data={data}
            initialLayout={hallLayout}
            layoutAvailable={hallLayoutAvailable}
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
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
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
