import { useState, useEffect } from "react";
import { VENDOR_CATEGORIES, type CreateVendorInput } from "../schemas";
import type { Vendor, VendorStatus } from "../types";

export function useVendorForm(
  initialVendor: Vendor | null,
  isOpen: boolean,
  onSubmit: (input: CreateVendorInput) => Promise<void>,
  onClose: () => void
) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(VENDOR_CATEGORIES[0]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [costNaira, setCostNaira] = useState("0");
  const [depositNaira, setDepositNaira] = useState("0");
  const [status, setStatus] = useState<VendorStatus>("contracted");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialVendor) {
      setName(initialVendor.name);
      setCategory(initialVendor.category);
      setContactName(initialVendor.contact_name || "");
      setContactPhone(initialVendor.contact_phone || "");
      setContactEmail(initialVendor.contact_email || "");
      setCostNaira(String(Math.round(initialVendor.cost_kobo / 100)));
      setDepositNaira(String(Math.round(initialVendor.deposit_kobo / 100)));
      setStatus(initialVendor.status);
    } else {
      setName("");
      setCategory(VENDOR_CATEGORIES[0]);
      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setCostNaira("0");
      setDepositNaira("0");
      setStatus("contracted");
    }
    setError(null);
  }, [initialVendor, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const costNum = Math.max(0, Math.round(Number(costNaira || 0) * 100));
    const depositNum = Math.max(0, Math.round(Number(depositNaira || 0) * 100));

    if (!name.trim()) {
      setError("Vendor name is required");
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        name: name.trim(),
        category,
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        cost_kobo: costNum,
        deposit_kobo: depositNum,
        status,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vendor");
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}
