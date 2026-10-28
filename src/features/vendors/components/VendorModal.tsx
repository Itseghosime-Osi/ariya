"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/50 backdrop-blur-xs">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <h2 className="font-serif text-lg font-bold text-wine">
            {initialVendor ? "Edit Vendor Contract" : "Register New Vendor"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-wine p-1 rounded-lg"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-wine mb-1">
              Vendor / Business Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ile-Ila Catering Services"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-wine mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden bg-white"
              >
                {VENDOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-wine mb-1">
                Contract Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VendorStatus)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden bg-white"
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
              <label className="block font-semibold text-wine mb-1">
                Total Cost (NGN ₦)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={costNaira}
                onChange={(e) => setCostNaira(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-wine mb-1">
                Deposit Paid (NGN ₦)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={depositNaira}
                onChange={(e) => setDepositNaira(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden"
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-outline-variant/50 text-wine hover:bg-wine/5 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-wine text-ivory font-semibold hover:bg-wine/90 disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : initialVendor
                  ? "Save Changes"
                  : "Create Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
