import React from "react";
import { Icon } from "@/components/ui/icon";

interface VendorEmptyStateProps {
  onAddVendor: () => void;
}

export function VendorEmptyState({ onAddVendor }: VendorEmptyStateProps) {
  return (
    <div className="bg-surface-container-low p-12 text-center rounded-2xl border border-outline-variant/30 space-y-3">
      <Icon name="storefront" className="text-4xl text-wine/40 block mx-auto" />
      <h3 className="font-serif text-lg text-wine font-medium">
        No Vendors Registered
      </h3>
      <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
        Add your caterers, decorators, photographers, and other event vendors to
        track contacts and tasks.
      </p>
      <button
        type="button"
        onClick={onAddVendor}
        className="px-4 py-2 rounded-xl bg-wine text-ivory text-xs font-semibold"
      >
        Add First Vendor
      </button>
    </div>
  );
}
