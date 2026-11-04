"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VENDOR_CATEGORIES, type CreateVendorInput } from "../schemas";
import { VendorContactFields } from "./VendorContactFields";
import { useVendorForm } from "./useVendorForm";
import type { Vendor, VendorStatus } from "../types";

interface VendorModalProps {
  isOpen: boolean;
  initialVendor: Vendor | null;
  onClose: () => void;
  onSubmit: (input: CreateVendorInput) => Promise<void>;
}

const LABEL = "text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink";
const FIELD =
  "desk-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none";

export function VendorModal({
  isOpen,
  initialVendor,
  onClose,
  onSubmit,
}: VendorModalProps) {
  const {
    name,
    setName,
    category,
    setCategory,
    contactName,
    setContactName,
    contactPhone,
    setContactPhone,
    contactEmail,
    setContactEmail,
    costNaira,
    setCostNaira,
    depositNaira,
    setDepositNaira,
    status,
    setStatus,
    loading,
    error,
    handleSubmit,
  } = useVendorForm(initialVendor, isOpen, onSubmit, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-y-auto border border-gold/30 bg-ivory p-0">
        <DialogHeader className="relative gap-1.5 px-6 pb-5 pt-7 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            Vendor loom
          </p>
          <DialogTitle className="font-serif text-3xl font-bold leading-tight">
            {initialVendor ? "Edit vendor contract" : "Register a vendor"}
          </DialogTitle>
          <DialogDescription>
            {initialVendor
              ? "Change the terms, contact or what has been paid so far."
              : "Add a supplier with their contract value and the deposit already paid."}
          </DialogDescription>
          <span
            aria-hidden="true"
            className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-gold/70 via-gold/20 to-transparent sm:inset-x-8"
          />
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 px-6 pb-6 pt-5 sm:px-8"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error-container px-3 py-2 text-xs text-error"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="vendor-name" className={LABEL}>
              Vendor / Business Name *
            </label>
            <input
              id="vendor-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ile-Ila Catering Services"
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vendor-category" className={LABEL}>
                Category *
              </label>
              <select
                id="vendor-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${FIELD} cursor-pointer`}
              >
                {VENDOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="vendor-status" className={LABEL}>
                Contract Status
              </label>
              <select
                id="vendor-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VendorStatus)}
                className={`${FIELD} cursor-pointer`}
              >
                <option value="draft">Draft / Inquiry</option>
                <option value="contracted">Contracted</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vendor-cost" className={LABEL}>
                Total Cost (NGN ₦)
              </label>
              <input
                id="vendor-cost"
                type="number"
                min="0"
                step="1000"
                value={costNaira}
                onChange={(e) => setCostNaira(e.target.value)}
                className={`${FIELD} tabular-nums`}
              />
            </div>
            <div>
              <label htmlFor="vendor-deposit" className={LABEL}>
                Deposit Paid (NGN ₦)
              </label>
              <input
                id="vendor-deposit"
                type="number"
                min="0"
                step="1000"
                value={depositNaira}
                onChange={(e) => setDepositNaira(e.target.value)}
                className={`${FIELD} tabular-nums`}
              />
            </div>
          </div>

          <VendorContactFields
            contactName={contactName}
            contactPhone={contactPhone}
            contactEmail={contactEmail}
            onNameChange={setContactName}
            onPhoneChange={setContactPhone}
            onEmailChange={setContactEmail}
          />

          <DialogFooter className="mt-2 flex flex-col-reverse gap-2 border-t border-outline-variant/60 pt-5 sm:flex-row sm:justify-end sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="rounded-full px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-full px-6"
            >
              {loading
                ? "Saving..."
                : initialVendor
                  ? "Save Changes"
                  : "Create Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
