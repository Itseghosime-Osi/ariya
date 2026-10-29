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
        <label
          htmlFor="field-name"
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink"
        >
          Full Name *
        </label>
        <Input
          required
          id="field-name"
          placeholder="Chief Olawale Adeyemi"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="mt-1.5 rounded-xl border-outline-variant/70 bg-surface-container-low focus-visible:border-gold"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="field-phone"
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink"
          >
            Phone (Nigerian E.164)
          </label>
          <Input
            id="field-phone"
            placeholder="0803 123 4567"
            value={state.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="mt-1.5 rounded-xl border-outline-variant/70 bg-surface-container-low focus-visible:border-gold"
          />
        </div>
        <div>
          <label
            htmlFor="field-email"
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink"
          >
            Email
          </label>
          <Input
            type="email"
            id="field-email"
            placeholder="olawale@example.com"
            value={state.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="mt-1.5 rounded-xl border-outline-variant/70 bg-surface-container-low focus-visible:border-gold"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="field-side"
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink"
          >
            Side
          </label>
          <Select
            value={state.side || "mutual"}
            onValueChange={(val) => onChange({ side: val })}
          >
            <SelectTrigger
              id="field-side"
              className="mt-1.5 rounded-xl bg-surface-container-low"
            >
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
          <label
            htmlFor="field-group"
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink"
          >
            Group
          </label>
          <Input
            id="field-group"
            placeholder="e.g. Lagos Friends"
            value={state.group}
            onChange={(e) => onChange({ group: e.target.value })}
            className="mt-1.5 rounded-xl border-outline-variant/70 bg-surface-container-low focus-visible:border-gold"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="field-party"
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink"
        >
          Party Size
        </label>
        <Input
          id="field-party"
          type="number"
          min={1}
          max={20}
          value={state.partySize}
          onChange={(e) => onChange({ partySize: Number(e.target.value) })}
          className="mt-1.5 rounded-xl border-outline-variant/70 bg-surface-container-low focus-visible:border-gold"
        />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-3">
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

        <div className="flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-3">
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
        <label
          htmlFor="field-notes"
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink"
        >
          Notes / Dietary Requirements
        </label>
        <Input
          id="field-notes"
          placeholder="e.g. Vegetarian, High table guest"
          value={state.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="mt-1.5 rounded-xl border-outline-variant/70 bg-surface-container-low focus-visible:border-gold"
        />
      </div>
    </div>
  );
}
