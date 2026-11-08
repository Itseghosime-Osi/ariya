/**
 * The archive's live 3D module.
 *
 * Client code imports only this URL. The import map the module needs lives in
 * `scene-import-map.ts`, which is server-only, so no client chunk carries a
 * `three` specifier into a route that has no business reaching the CDN.
 */
export const SCENE_URL = "/site/assets/the-yes-scene.5d2cde94cd5e.js";
