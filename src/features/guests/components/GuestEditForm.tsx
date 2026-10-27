"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuestWithDetails } from "../types";
import { updateGuestAction } from "../actions";

interface GuestEditFormProps {
  eventId: string;
  guest: GuestWithDetails;
  onSuccess: (updatedGuest: GuestWithDetails) => void;
  onCancel: () => void;
}

export function GuestEditForm({
  eventId,
  guest,
  onSuccess,
  onCancel,
}: GuestEditFormProps) {
  const [name, setName] = React.useState(guest.name);
  const [phone, setPhone] = React.useState(guest.phone || "");
  const [email, setEmail] = React.useState(guest.email || "");
  const [side, setSide] = React.useState(guest.side || "mutual");
  const [group, setGroup] = React.useState(guest.group_name || "");
  const [partySize, setPartySize] = React.useState(guest.party_size);
  const [plusOnesAllowed, setPlusOnesAllowed] = React.useState(
    Boolean(guest.plus_ones_allowed)
  );
  const [isVip, setIsVip] = React.useState(guest.is_vip);
  const [notes, setNotes] = React.useState(guest.notes || "");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await updateGuestAction(guest.id, eventId, {
        name,
        phone: phone || null,
        email: email || null,
        side,
        group_name: group || null,
        party_size: Number(partySize),
        plus_ones_allowed: plusOnesAllowed,
        is_vip: isVip,
        notes: notes || null,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      onSuccess({
        ...guest,
        name,
        phone: phone || null,
        email: email || null,
        side,
        group_name: group || null,
        party_size: Number(partySize),
        plus_ones_allowed: plusOnesAllowed,
        is_vip: isVip,
        notes: notes || null,
      });
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="text-xs font-semibold uppercase text-on-surface-variant">
          Full Name *
        </label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold uppercase text-on-surface-variant">
            Phone (E.164)
          </label>
          <Input
            placeholder="08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-on-surface-variant">
            Email
          </label>
          <Input
            type="email"
            placeholder="guest@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold uppercase text-on-surface-variant">
            Side
          </label>
          <Select value={side} onValueChange={setSide}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bride">Bride</SelectItem>
              <SelectItem value="groom">Groom</SelectItem>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="planner">Planner</SelectItem>
              <SelectItem value="mutual">Mutual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-on-surface-variant">
            Group
          </label>
          <Input
            placeholder="e.g. Lagos Friends"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase text-on-surface-variant">
          Party Size
        </label>
        <Input
          type="number"
          min={1}
          max={20}
          value={partySize}
          onChange={(e) => setPartySize(Number(e.target.value))}
          className="mt-1"
        />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="edit-plus-ones"
            checked={plusOnesAllowed}
            onCheckedChange={(val) => setPlusOnesAllowed(!!val)}
          />
          <label
            htmlFor="edit-plus-ones"
            className="text-xs font-medium cursor-pointer text-on-surface"
          >
            Allow +1 Companion on RSVP
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="edit-vip"
            checked={isVip}
            onCheckedChange={(val) => setIsVip(!!val)}
          />
          <label
            htmlFor="edit-vip"
            className="text-xs font-medium cursor-pointer text-on-surface"
          >
            Mark as VIP Guest
          </label>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase text-on-surface-variant">
          Notes / Dietary
        </label>
        <Input
          placeholder="e.g. Vegetarian, High table guest"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/40">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
