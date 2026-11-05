"use client";

import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";

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

const LABEL =
  "mb-1 block px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-label-2";
const FIELD =
  "desk-field min-h-[44px] w-full rounded-2xl px-4 text-base text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none sm:text-sm";

const SIDES = [
  ["bride", "Bride"],
  ["groom", "Groom"],
  ["family", "Family"],
  ["vip", "VIP"],
  ["planner", "Planner"],
  ["mutual", "Mutual"],
] as const;

export function GuestFormFields({ state, onChange }: GuestFormFieldsProps) {
  const party = Number.isFinite(state.partySize) ? state.partySize : 1;
  const setParty = (n: number) =>
    onChange({ partySize: Math.min(20, Math.max(1, n)) });

  return (
    <div className="flex flex-col gap-3.5 text-sm">
      <div>
        <label htmlFor="field-name" className={LABEL}>
          Full name *
        </label>
        <input
          required
          id="field-name"
          placeholder="Chief Olawale Adeyemi"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={FIELD}
        />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="field-phone" className={LABEL}>
            Phone
          </label>
          <input
            id="field-phone"
            type="tel"
            placeholder="0803 123 4567"
            value={state.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="field-email" className={LABEL}>
            Email
          </label>
          <input
            type="email"
            id="field-email"
            placeholder="olawale@example.com"
            value={state.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <span id="field-side-label" className={LABEL}>
          Side
        </span>
        <div
          role="radiogroup"
          aria-labelledby="field-side-label"
          className="flex flex-wrap gap-1.5"
        >
          {SIDES.map(([value, label]) => {
            const on = (state.side || "mutual") === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ side: value })}
                className={`min-h-[36px] rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  on
                    ? "border border-burgundy bg-burgundy text-ivory"
                    : "desk-chip text-label-2 hover:text-night"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <label htmlFor="field-group" className={LABEL}>
            Group
          </label>
          <input
            id="field-group"
            placeholder="e.g. Lagos Friends"
            value={state.group}
            onChange={(e) => onChange({ group: e.target.value })}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="field-party" className={LABEL}>
            Party size
          </label>
          <div className="desk-field flex min-h-[44px] items-center rounded-full p-1">
            <button
              type="button"
              aria-label="Fewer guests"
              disabled={party <= 1}
              onClick={() => setParty(party - 1)}
              className="grid h-9 w-9 place-items-center rounded-full text-burgundy transition-colors hover:bg-burgundy/10 disabled:opacity-40"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                −
              </span>
            </button>
            <input
              id="field-party"
              type="number"
              min={1}
              max={20}
              value={party}
              onChange={(e) => setParty(Number(e.target.value))}
              className="w-9 bg-transparent text-center text-base font-semibold tabular-nums text-night [appearance:textfield] focus-visible:outline-none sm:text-sm [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label="More guests"
              disabled={party >= 20}
              onClick={() => setParty(party + 1)}
              className="grid h-9 w-9 place-items-center rounded-full text-burgundy transition-colors hover:bg-burgundy/10 disabled:opacity-40"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                +
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-white/40 divide-y divide-hairline">
        <ToggleRow
          icon="person"
          label="Allow a +1 companion"
          hint="Shown on their digital invitation"
          on={state.plusOnesAllowed}
          onChange={(v) => onChange({ plusOnesAllowed: v })}
        />
        <ToggleRow
          icon="verified"
          label="Mark as VIP"
          hint="Highlighted on the guest list"
          on={state.isVip}
          onChange={(v) => onChange({ isVip: v })}
        />
      </div>

      <div>
        <label htmlFor="field-notes" className={LABEL}>
          Notes / dietary needs
        </label>
        <input
          id="field-notes"
          placeholder="e.g. Vegetarian, High table guest"
          value={state.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className={FIELD}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  on,
  onChange,
}: {
  icon: "person" | "verified";
  label: string;
  hint: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-3 py-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-burgundy/[0.07] text-gold-ink">
        <Icon name={icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-night">
          {label}
        </span>
        <span className="block text-[12px] text-label-2">{hint}</span>
      </span>
      <Switch on={on} onChange={onChange} label={label} />
    </div>
  );
}
