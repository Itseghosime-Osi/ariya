"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface GuestFormState {
  name: string;
  phone: string;
  email: string;
  side: string;
  group: string;
  partySize: number;
  plusOnesAllowed: boolean;
  isVip: boolean;
  notes: string;
}

interface GuestFormFieldsProps {
  state: GuestFormState;
  onChange: (patch: Partial<GuestFormState>) => void;
}

export function GuestFormFields({ state, onChange }: GuestFormFieldsProps) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <label className="text-xs font-semibold uppercase text-on-surface-variant">
          Full Name *
        </label>
        <Input
          required
          placeholder="Chief Olawale Adeyemi"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
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
            value={state.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
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
            value={state.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold uppercase text-on-surface-variant">
            Side
          </label>
          <Select
            value={state.side || "mutual"}
            onValueChange={(val) => onChange({ side: val })}
          >
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
            value={state.group}
            onChange={(e) => onChange({ group: e.target.value })}
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
          value={state.partySize}
          onChange={(e) => onChange({ partySize: Number(e.target.value) })}
          className="mt-1"
        />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="field-plus-ones"
            checked={state.plusOnesAllowed}
            onCheckedChange={(val) => onChange({ plusOnesAllowed: !!val })}
          />
          <label
            htmlFor="field-plus-ones"
            className="text-xs font-medium cursor-pointer text-on-surface"
          >
            Allow +1 Companion on digital invitation
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="field-vip"
            checked={state.isVip}
            onCheckedChange={(val) => onChange({ isVip: !!val })}
          />
          <label
            htmlFor="field-vip"
            className="text-xs font-medium cursor-pointer text-on-surface"
          >
            Mark as VIP Guest
          </label>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase text-on-surface-variant">
          Notes / Dietary Requirements
        </label>
        <Input
          placeholder="e.g. Vegetarian, High table guest"
          value={state.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="mt-1"
        />
      </div>
    </div>
  );
}
