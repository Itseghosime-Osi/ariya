import "server-only";

/**
 * The import map the archive's scene module needs, for the <head> of the film
 * and marketing layouts.
 *
 * Server-only on purpose: the map names a `three` build on a CDN, and nothing
 * under (shell) — the logged-in app — may ship a specifier that could pull it.
 */
export const SCENE_IMPORT_MAP = JSON.stringify({
  imports: {
    three: "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/",
  },
});
