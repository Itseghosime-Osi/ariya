/**
 * The archive's live 3D module and the import map it needs.
 *
 * The module imports three by bare specifier, so the map has to be in the
 * document before the module is appended. Both the film and the marketing
 * layouts put it in their <head>; the film and /about both load the module.
 */
export const SCENE_URL = "/site/assets/the-yes-scene.83edb5453053.js";

export const SCENE_IMPORT_MAP = JSON.stringify({
  imports: {
    three: "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/",
  },
});
