import type { InvitationDesign, InvitationLayer } from "../../types";
import { layerLabel } from "./LayersDock";

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

const short = (layer: InvitationLayer) => {
  const label = layerLabel(layer);
  return label.length > 22 ? `${label.slice(0, 21)}…` : label;
};

/** One layer changed: say what kind of change it was. */
function describeLayerChange(a: InvitationLayer, b: InvitationLayer): string {
  const keys = new Set([
    ...Object.keys(a),
    ...Object.keys(b),
  ] as (keyof InvitationLayer)[]);
  const changed = [...keys].filter((key) => !same(a[key], b[key]));
  const only = (...allowed: string[]) =>
    changed.every((key) => allowed.includes(key as string));
  const name = short(b);
  if (only("x", "y")) return `Moved ${name}`;
  if (only("width", "height", "x", "y", "size")) return `Resized ${name}`;
  if (only("rotation", "x", "y")) return `Rotated ${name}`;
  if (only("visible")) return `${b.visible ? "Showed" : "Hid"} ${name}`;
  if (only("locked")) return `${b.locked ? "Locked" : "Unlocked"} ${name}`;
  if (only("text")) return `Edited ${name}`;
  if (only("flipX", "flipY")) return `Flipped ${name}`;
  if (only("name")) return `Renamed ${name}`;
  if (
    only(
      "opacity",
      "blendMode",
      "blur",
      "shadow",
      "shadowBlur",
      "shadowX",
      "shadowY"
    )
  )
    return `Changed the look of ${name}`;
  if (only("color", "colorRole")) return `Recoloured ${name}`;
  return `Changed ${name}`;
}

/** What a history step did, in plain words, by comparing it with the step before. */
export function describeStep(
  before: InvitationDesign | null,
  after: InvitationDesign
): string {
  if (!before) return "Original invitation";
  const prev = new Map(before.layers.map((l) => [l.id, l]));
  const next = new Map(after.layers.map((l) => [l.id, l]));
  const added = after.layers.filter((l) => !prev.has(l.id));
  const removed = before.layers.filter((l) => !next.has(l.id));
  if (added.length === 1 && !removed.length) return `Added ${short(added[0])}`;
  if (removed.length === 1 && !added.length)
    return `Deleted ${short(removed[0])}`;
  if (added.length || removed.length)
    return `${added.length ? `Added ${added.length}` : ""}${added.length && removed.length ? ", " : ""}${removed.length ? `Deleted ${removed.length}` : ""} layers`;
  const changedLayers = after.layers.filter((l) => !same(prev.get(l.id), l));
  const sameOrder = before.layers.every((l, i) => after.layers[i]?.id === l.id);
  if (!sameOrder && !changedLayers.length) return "Reordered layers";
  if (changedLayers.length === 1)
    return describeLayerChange(
      prev.get(changedLayers[0].id)!,
      changedLayers[0]
    );
  if (changedLayers.length > 1) return `Changed ${changedLayers.length} layers`;
  if (!sameOrder) return "Reordered layers";
  if (!same(before.canvas, after.canvas)) return "Resized the card";
  if (!same(before.background, after.background))
    return "Changed the background";
  if (!same(before.palette, after.palette) || before.theme !== after.theme)
    return "Changed the colours";
  return "Edited the card";
}
