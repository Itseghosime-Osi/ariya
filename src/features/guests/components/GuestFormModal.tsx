"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { createGuestAction } from "../actions";

interface GuestFormModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GuestFormModal({
  eventId,
  isOpen,
  onClose,
  onSuccess,
}: GuestFormModalProps) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [side, setSide] = React.useState("mutual");
  const [group, setGroup] = React.useState("");
  const [partySize, setPartySize] = React.useState(1);
  const [plusOnesAllowed, setPlusOnesAllowed] = React.useState(false);
  const [isVip, setIsVip] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setPhone("");
      setEmail("");
      setSide("mutual");
      setGroup("");
      setPartySize(1);
      setPlusOnesAllowed(false);
      setIsVip(false);
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await createGuestAction(eventId, {
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

      onSuccess();
      onClose();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Add New Guest
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 text-sm mt-2"
        >
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
              placeholder="Chief Olawale Adeyemi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-on-surface-variant">
                Phone (Nigerian E.164)
              </label>
              <Input
                placeholder="0803 123 4567"
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
                placeholder="olawale@example.com"
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
                placeholder="e.g. Groom's University Friends"
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
                id="modal-plus-one"
                checked={plusOnesAllowed}
                onCheckedChange={(val) => setPlusOnesAllowed(!!val)}
              />
              <label
                htmlFor="modal-plus-one"
                className="text-xs font-medium cursor-pointer text-on-surface"
              >
                Allow +1 Companion on digital invitation
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="modal-vip"
                checked={isVip}
                onCheckedChange={(val) => setIsVip(!!val)}
              />
              <label
                htmlFor="modal-vip"
                className="text-xs font-medium cursor-pointer text-on-surface"
              >
                VIP Guest (Highlight in registry & prioritize seating)
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">
              Notes / Dietary Requirements
            </label>
            <Input
              placeholder="e.g. Vegetarian, High table guest"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding Guest..." : "Add to Guestbook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
