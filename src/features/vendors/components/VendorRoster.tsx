"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { VendorHeader } from "./VendorHeader";
import { VendorCard } from "./VendorCard";
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
import type { Vendor, VendorWithTasks, VendorsData } from "../types";
import type { CreateVendorInput } from "../schemas";

interface VendorRosterProps {
  eventId: string;
  initialData: VendorsData;
}

export function VendorRoster({ eventId, initialData }: VendorRosterProps) {
  const [vendors, setVendors] = useState<VendorWithTasks[]>(
    initialData.vendors
  );
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeVendorForTask, setActiveVendorForTask] =
    useState<VendorWithTasks | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allTasks = vendors.flatMap((v) => v.tasks);
  const stats = computeVendorStats(vendors, allTasks);

  const handleSaveVendor = async (input: CreateVendorInput) => {
    if (editingVendor) {
      const res = await updateVendorAction(eventId, editingVendor.id, input);
      if (!res.ok || !res.data)
        throw new Error(res.error || "Failed to update vendor");
      setVendors((prev) =>
        prev.map((v) => (v.id === editingVendor.id ? { ...v, ...res.data } : v))
      );
    } else {
      const res = await createVendorAction(eventId, input);
      if (!res.ok || !res.data)
        throw new Error(res.error || "Failed to create vendor");
      const createdVendor: VendorWithTasks = { ...res.data, tasks: [] };
      setVendors((prev) => [...prev, createdVendor]);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this vendor and all associated tasks?"
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
      throw new Error(res.error || "Failed to add task");
    const newTask = res.data;
    setVendors((prev) =>
      prev.map((v) =>
        v.id === activeVendorForTask.id
          ? { ...v, tasks: [...v.tasks, newTask] }
          : v
      )
    );
  };

  const handleToggleTask = async (taskId: string, isDone: boolean) => {
    setVendors((prev) =>
      prev.map((v) => ({
        ...v,
        tasks: v.tasks.map((t) =>
          t.id === taskId ? { ...t, is_done: isDone } : t
        ),
      }))
    );
    const res = await updateVendorTaskAction(eventId, taskId, {
      is_done: isDone,
    });
    if (!res.ok) {
      setErrorMsg(res.error || "Failed to update task state");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setVendors((prev) =>
      prev.map((v) => ({
        ...v,
        tasks: v.tasks.filter((t) => t.id !== taskId),
      }))
    );
    const res = await deleteVendorTaskAction(eventId, taskId);
    if (!res.ok) {
      setErrorMsg(res.error || "Failed to delete task");
    }
  };

  return (
    <div className="space-y-6">
      <VendorHeader
        eventId={eventId}
        stats={stats}
        onAddVendor={() => {
          setEditingVendor(null);
          setIsVendorModalOpen(true);
        }}
      />

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}

      {vendors.length === 0 ? (
        <div className="bg-surface-container-low p-12 text-center rounded-2xl border border-outline-variant/30 space-y-3">
          <Icon
            name="storefront"
            className="text-4xl text-wine/40 block mx-auto"
          />
          <h3 className="font-serif text-lg text-wine font-medium">
            No Vendors Registered
          </h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Bring ceremonial coordinators, caterers, decorators, and
            photographers into your planning registry.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingVendor(null);
              setIsVendorModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-wine text-ivory text-xs font-semibold"
          >
            Register First Vendor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onEdit={(v) => {
                setEditingVendor(v);
                setIsVendorModalOpen(true);
              }}
              onDelete={handleDeleteVendor}
              onAddTask={(v) => {
                setActiveVendorForTask(v);
                setIsTaskModalOpen(true);
              }}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
      )}

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
