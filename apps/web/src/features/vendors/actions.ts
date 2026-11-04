"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  createVendorSchema,
  updateVendorSchema,
  createVendorTaskSchema,
  updateVendorTaskSchema,
  type CreateVendorInput,
  type UpdateVendorInput,
  type CreateVendorTaskInput,
  type UpdateVendorTaskInput,
} from "./schemas";
import type { Vendor, VendorTask } from "./types";

type VendorUpdate = Database["public"]["Tables"]["vendors"]["Update"];
type VendorTaskUpdate = Database["public"]["Tables"]["vendor_tasks"]["Update"];

export type ActionResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export async function createVendorAction(
  eventId: string,
  input: CreateVendorInput
): Promise<ActionResult<Vendor>> {
  const parsed = createVendorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  const { data, error } = await supabase
    .from("vendors")
    .insert({
      event_id: eventId,
      name: parsed.data.name,
      category: parsed.data.category,
      contact_name: parsed.data.contact_name || null,
      contact_phone: parsed.data.contact_phone || null,
      contact_email: parsed.data.contact_email || null,
      cost_kobo: parsed.data.cost_kobo,
      deposit_kobo: parsed.data.deposit_kobo,
      status: parsed.data.status,
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to create vendor" };
  }

  revalidatePath(`/events/${eventId}/vendors`);
  return { ok: true, data: data as Vendor };
}

export async function updateVendorAction(
  eventId: string,
  vendorId: string,
  input: UpdateVendorInput
): Promise<ActionResult<Vendor>> {
  const parsed = updateVendorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  const updatePayload: VendorUpdate = {};
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
  if (parsed.data.category !== undefined)
    updatePayload.category = parsed.data.category;
  if (parsed.data.contact_name !== undefined)
    updatePayload.contact_name = parsed.data.contact_name || null;
  if (parsed.data.contact_phone !== undefined)
    updatePayload.contact_phone = parsed.data.contact_phone || null;
  if (parsed.data.contact_email !== undefined)
    updatePayload.contact_email = parsed.data.contact_email || null;
  if (parsed.data.cost_kobo !== undefined)
    updatePayload.cost_kobo = parsed.data.cost_kobo;
  if (parsed.data.deposit_kobo !== undefined)
    updatePayload.deposit_kobo = parsed.data.deposit_kobo;
  if (parsed.data.status !== undefined)
    updatePayload.status = parsed.data.status;

  const { data, error } = await supabase
    .from("vendors")
    .update(updatePayload)
    .eq("id", vendorId)
    .eq("event_id", eventId)
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to update vendor" };
  }

  revalidatePath(`/events/${eventId}/vendors`);
  return { ok: true, data: data as Vendor };
}

export async function deleteVendorAction(
  eventId: string,
  vendorId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("id", vendorId)
    .eq("event_id", eventId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}/vendors`);
  return { ok: true };
}

export async function createVendorTaskAction(
  eventId: string,
  input: CreateVendorTaskInput
): Promise<ActionResult<VendorTask>> {
  const parsed = createVendorTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  const { data, error } = await supabase
    .from("vendor_tasks")
    .insert({
      event_id: eventId,
      vendor_id: parsed.data.vendor_id,
      task: parsed.data.task,
      due_date: parsed.data.due_date || null,
      is_done: parsed.data.is_done ?? false,
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to create task" };
  }

  revalidatePath(`/events/${eventId}/vendors`);
  return { ok: true, data: data as VendorTask };
}

export async function updateVendorTaskAction(
  eventId: string,
  taskId: string,
  input: UpdateVendorTaskInput
): Promise<ActionResult<VendorTask>> {
  const parsed = updateVendorTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  const updatePayload: VendorTaskUpdate = {};
  if (parsed.data.task !== undefined) updatePayload.task = parsed.data.task;
  if (parsed.data.due_date !== undefined)
    updatePayload.due_date = parsed.data.due_date || null;
  if (parsed.data.is_done !== undefined)
    updatePayload.is_done = parsed.data.is_done;

  const { data, error } = await supabase
    .from("vendor_tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("event_id", eventId)
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to update task" };
  }

  revalidatePath(`/events/${eventId}/vendors`);
  return { ok: true, data: data as VendorTask };
}

export async function deleteVendorTaskAction(
  eventId: string,
  taskId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  const { error } = await supabase
    .from("vendor_tasks")
    .delete()
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}/vendors`);
  return { ok: true };
}
