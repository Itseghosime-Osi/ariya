# ADR 0002: Film & Marketing Site Asset Isolation

## Status

Accepted

## Context

The repository houses an interactive WebGL narrative wedding film ("The Yes") crafted with `Three.js` and `GSAP`, alongside rich static marketing assets. Originally written as static HTML/CSS/JS, this film represents a crucial brand touchpoint.

However:

1. `Three.js` and WebGL shaders are resource-intensive (~600 KB+ minified).
2. Importing WebGL or animation scripts into the App Router bundle would severely compromise mobile performance for guests accessing digital invitations on low-bandwidth cellular networks in Nigeria.
3. The film requires bespoke canvas controls that conflict with React 19 component lifecycles.

## Decision

1. **Physical Isolation in `public/site/`**: All static marketing pages and the film are stored strictly under `public/site/` and served framework-free.
2. **`beforeFiles` Rewrites**: Configured in `next.config.ts`, requests to `/`, `/about`, `/product`, `/pricing`, `/story`, and `/film` rewrite directly to `/site/*` before Next.js filesystem routing evaluates app pages.
3. **Strict Prohibition on `/assets/`**:
   - The route prefix `/assets/*` is exclusively reserved for the static site asset rewrite (`/assets/:path*` -> `/site/assets/:path*`).
   - App code under `src/` must NEVER import from, link to, or serve files from `/assets/`. App icons and static UI elements must reside in `src/assets/` or be served from Supabase Storage.
4. **Zero WebGL Bundling**: No `three`, `gsap`, or film code may ever be imported into `src/`. `next build` analysis verifies that guest routes remain unencumbered by film dependencies.

## Consequences

- **Positive**: The film operates smoothly with its original custom WebGL pipeline; application routes remain ultra-lean (<10 KB page JS on guest RSVP routes).
- **Negative**: Marketing pages do not share React layout components; changes to marketing copy must be made directly in `public/site/` HTML files.
