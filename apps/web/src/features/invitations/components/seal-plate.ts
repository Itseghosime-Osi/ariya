/** Measure actual text/image bounds, so clear layouts retain their existing paper appearance. */
export function updateEntrySealPlates(root: HTMLElement) {
  const layers = Array.from(
    root.querySelectorAll<HTMLElement>("[data-layer-id]")
  );
  for (const seal of layers.filter((layer) =>
    layer.hasAttribute("data-entry-seal")
  )) {
    const plate = seal.querySelector<SVGElement>("[data-seal-plate]");
    if (!plate) continue;
    const required = plate.getAttribute("data-seal-plate-required") === "true";
    const box = seal.getBoundingClientRect();
    const covered =
      box.width > 0 &&
      box.height > 0 &&
      layers.some((layer) => {
        if (layer.hasAttribute("data-entry-seal")) return false;
        const style = getComputedStyle(layer);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0
        )
          return false;
        const rect = layer.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        // Shadows and blur can extend beyond the layout box; reserve their visible neighbourhood too.
        const values = Array.from(
          `${style.filter} ${style.textShadow}`.matchAll(/(-?[\d.]+)px/g),
          (match) => Math.abs(Number(match[1]))
        );
        const grow = Math.max(0, ...values) * 2;
        return (
          box.left < rect.right + grow &&
          box.right > rect.left - grow &&
          box.top < rect.bottom + grow &&
          box.bottom > rect.top - grow
        );
      });
    const display = required || covered ? "" : "none";
    if (plate.style.display !== display) plate.style.display = display;
  }
}
