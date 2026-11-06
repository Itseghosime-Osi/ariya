import type {
  AcUnit,
  Cooling,
  ThermalRequest,
  Zone as WireZone,
} from "@ariya/studio";
import type { HallLayout, Zone } from "./model";

/** The dance floor is a dense crowd: research §C.6 puts it at ~200 W/m², which is about 1.3
 * people per square metre at 150 W each. The lumped model needs a head count, so this is it. */
const DANCERS_PER_M2 = 1.3;

/** How many guests are on the dance floor at once, from the floor the host has drawn. */
export function dancingFor(layout: HallLayout, headcount: number): number {
  const area = layout.zones
    .filter((z) => z.kind === "dance")
    .reduce((sum, z) => sum + z.w * z.h, 0);
  return Math.min(headcount, Math.round(area * DANCERS_PER_M2));
}

/** The hall's drawn zone as the wire reads it. Shared: every deck that sends zones sends them the
 * same way, and a zone that is optional on screen is explicit on the wire. */
export function wireZone(z: Zone): WireZone {
  return {
    id: z.id,
    kind: z.kind,
    label: z.label,
    x: z.x,
    y: z.y,
    w: z.w,
    h: z.h,
    shape: z.shape ?? null,
    rot: z.rot ?? null,
  };
}

/** A cooling plan with nothing answered yet. */
export function defaultCooling(): Cooling {
  return { units: [], ach: null, targetC: null };
}

let unitCounter = 0;
export function unitId(): string {
  unitCounter += 1;
  return `ac${Date.now().toString(36)}${unitCounter}`;
}

/** The size a new unit starts at: the one a hall needs, so the first placement is not a toy. */
export const DEFAULT_UNIT_HP = 2.5;

/**
 * The thermal request for a layout. The cooling the host has planned lives on the venue profile,
 * so a plan saved before the studio knew about cooling still asks a sensible question.
 */
export function thermalRequest(
  layout: HallLayout,
  headcount: number
): ThermalRequest {
  const cooling = layout.venue.cooling;
  return {
    width: layout.width,
    length: layout.length,
    height: layout.ceiling,
    venue: layout.venue.type,
    headcount,
    dancing: dancingFor(layout, headcount),
    ach: cooling?.ach ?? null,
    outdoorC: null,
    outdoorRh: null,
    targetC: cooling?.targetC ?? null,
    glazingM2: null,
    unitHp: null,
    derate: null,
    units: cooling?.units ?? [],
    zones: layout.zones.map(wireZone),
  };
}

/** The units the host has placed, or an empty list. */
export function unitsOf(layout: HallLayout): AcUnit[] {
  return layout.venue.cooling?.units ?? [];
}
