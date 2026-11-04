"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { DeskPageHeader } from "@/components/ui/desk-page-header";
import { useDeskToast } from "@/components/ui/desk-toast";
import { celebratedIfAllDone } from "../lib/celebrate-vendors";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";
import { VendorLoom } from "./VendorLoom";
import { VendorFilters, type VendorStatusFilter } from "./VendorFilters";
import { VendorThread } from "./VendorThread";
import { VendorModal } from "./VendorModal";
import { VendorTaskModal } from "./VendorTaskModal";
import {
  createVendorAction,
  updateVendorAction,
  deleteVendorAction,
  createVendorTaskAction,
  updateVendorTaskAction,
  deleteVendorTaskAction,
} from "../actions";
import { computeVendorStats } from "../utils";
import {
  sortVendors,
  statusCounts,
  vendorMatchesQuery,
  type VendorSort,
} from "../lib/vendor-insights";
import type { Vendor, VendorWithTasks, VendorsData } from "../types";
import type { CreateVendorInput } from "../schemas";

interface VendorDeskProps {
  eventId: string;
  eventTitle: string;
  todayKey: string;
  initialData: VendorsData;
}

export function VendorDesk({
  eventId,
  eventTitle,
  todayKey,
  initialData,
}: VendorDeskProps) {
  const [vendors, setVendors] = useState<VendorWithTasks[]>(
    initialData.vendors
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<VendorStatusFilter>("all");
  const [sort, setSort] = useState<VendorSort>("attention");
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeVendorForTask, setActiveVendorForTask] =
    useState<VendorWithTasks | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { showToast, toast } = useDeskToast();

  const allTasks = vendors.flatMap((vendor) => vendor.tasks);
  const stats = computeVendorStats(vendors, allTasks);
  const counts = statusCounts(vendors);

  const visible = useMemo(() => {
    const filtered = vendors.filter(
      (vendor) =>
        (status === "all" || vendor.status === status) &&
        vendorMatchesQuery(vendor, query)
    );
    return sortVendors(filtered, sort, todayKey);
  }, [vendors, status, query, sort, todayKey]);

  const openAddVendor = () => {
    setEditingVendor(null);
    setIsVendorModalOpen(true);
  };

  const handleSaveVendor = async (input: CreateVendorInput) => {
    if (editingVendor) {
      const res = await updateVendorAction(eventId, editingVendor.id, input);
      if (!res.ok || !res.data)
        throw new Error(res.error || "Failed to update vendor");
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === editingVendor.id ? { ...vendor, ...res.data } : vendor
        )
      );
      showToast("Vendor updated");
    } else {
      const res = await createVendorAction(eventId, input);
      if (!res.ok || !res.data)
        throw new Error(res.error || "Failed to create vendor");
      const createdVendor: VendorWithTasks = { ...res.data, tasks: [] };
      setVendors((prev) => [...prev, createdVendor]);
      showToast("Vendor added");
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (
      !confirm(
        `Delete ${vendor?.name ?? "this vendor"} and every deliverable attached to it?`
      )
    ) {
      return;
    }
    const res = await deleteVendorAction(eventId, vendorId);
    if (!res.ok) {
      setErrorMsg(res.error || "Failed to delete vendor");
      return;
    }
    setVendors((prev) => prev.filter((v) => v.id !== vendorId));
    showToast("Vendor removed");
  };

  const handleAddTask = async (task: string, dueDate: string | null) => {
    if (!activeVendorForTask) return;
    const res = await createVendorTaskAction(eventId, {
      vendor_id: activeVendorForTask.id,
      task,
      due_date: dueDate,
      is_done: false,
    });
    if (!res.ok || !res.data)
      throw new Error(res.error || "Failed to add deliverable");
    const newTask = res.data;
    setVendors((prev) =>
      prev.map((vendor) =>
        vendor.id === activeVendorForTask.id
          ? { ...vendor, tasks: [...vendor.tasks, newTask] }
          : vendor
      )
    );
  };

  const handleToggleTask = async (taskId: string, isDone: boolean) => {
    setVendors((prev) =>
      prev.map((vendor) => ({
        ...vendor,
        tasks: vendor.tasks.map((task) =>
          task.id === taskId ? { ...task, is_done: isDone } : task
        ),
      }))
    );
    const res = await updateVendorTaskAction(eventId, taskId, {
      is_done: isDone,
    });
    if (!res.ok) {
      setErrorMsg(res.error || "Failed to update deliverable");
      setVendors((prev) =>
        prev.map((vendor) => ({
          ...vendor,
          tasks: vendor.tasks.map((task) =>
            task.id === taskId ? { ...task, is_done: !isDone } : task
          ),
        }))
      );
      return;
    }
    if (isDone) {
      celebratedIfAllDone(eventId, vendors, taskId);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const previous = vendors;
    setVendors((prev) =>
      prev.map((vendor) => ({
        ...vendor,
        tasks: vendor.tasks.filter((task) => task.id !== taskId),
      }))
    );
    const res = await deleteVendorTaskAction(eventId, taskId);
    if (!res.ok) {
      setErrorMsg(res.error || "Failed to delete deliverable");
      setVendors(previous);
    }
  };

  return (
    <div className="pb-16">
      {toast}

      <DeskMotion className="space-y-6 lg:space-y-8">
        <DeskItem>
          <DeskPageHeader
            eyebrow={`Vendors · ${eventTitle}`}
            title="The vendor loom"
            description="Every supplier, contract and deliverable in one place. Tick the work off as the owambe comes together."
          >
            <button
              type="button"
              onClick={openAddVendor}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory shadow-sm transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <Icon name="add_circle" size={18} />
              Add vendor
            </button>
          </DeskPageHeader>
        </DeskItem>

        <DeskItem>
          <VendorLoom vendors={vendors} stats={stats} />
        </DeskItem>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-sm text-error"
          >
            <span className="flex items-center gap-2">
              <Icon name="error" size={16} />
              {errorMsg}
            </span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              aria-label="Dismiss error"
              className="rounded-full p-1 hover:bg-white/40"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        {vendors.length === 0 ? (
          <DeskItem>
            <section className="bento-card flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-tint-sand text-gold-ink">
                <Icon name="table_restaurant" size={24} />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-night">
                No vendors on the loom yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-label-2">
                Add your caterer, band, photographer and aso-ebi tailor to track
                contracts, deposits and what is still owed.
              </p>
              <button
                type="button"
                onClick={openAddVendor}
                className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory hover:bg-wine"
              >
                <Icon name="add_circle" size={18} />
                Add your first vendor
              </button>
            </section>
          </DeskItem>
        ) : (
          <>
            <DeskItem>
              <VendorFilters
                query={query}
                onQueryChange={setQuery}
                status={status}
                onStatusChange={setStatus}
                sort={sort}
                onSortChange={setSort}
                counts={counts}
                total={vendors.length}
                shown={visible.length}
              />
            </DeskItem>

            {visible.length === 0 ? (
              <DeskItem>
                <section className="bento-card flex flex-col items-center justify-center px-6 py-14 text-center">
                  <h2 className="font-display text-xl font-bold text-night">
                    Nothing matches that yet
                  </h2>
                  <p className="mt-1 text-sm text-label-2">
                    Try another word, or widen the status filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setStatus("all");
                    }}
                    className="desk-chip mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    Clear filters
                  </button>
                </section>
              </DeskItem>
            ) : (
              <DeskItem>
                <ul className="overflow-hidden rounded-3xl border border-hairline bg-white/40 divide-y divide-hairline">
                  {visible.map((vendor) => (
                    <VendorThread
                      key={vendor.id}
                      vendor={vendor}
                      todayKey={todayKey}
                      onEdit={(target) => {
                        setEditingVendor(target);
                        setIsVendorModalOpen(true);
                      }}
                      onDelete={handleDeleteVendor}
                      onAddTask={(target) => {
                        setActiveVendorForTask(target);
                        setIsTaskModalOpen(true);
                      }}
                      onToggleTask={handleToggleTask}
                      onDeleteTask={handleDeleteTask}
                    />
                  ))}
                </ul>
              </DeskItem>
            )}
          </>
        )}
      </DeskMotion>

      <VendorModal
        isOpen={isVendorModalOpen}
        initialVendor={editingVendor}
        onClose={() => setIsVendorModalOpen(false)}
        onSubmit={handleSaveVendor}
      />

      <VendorTaskModal
        isOpen={isTaskModalOpen}
        vendorName={activeVendorForTask?.name || ""}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleAddTask}
      />
    </div>
  );
}
