# OwambePlan

In-house experiment for Tech4Youth Edo, Module 06, Project 36: a wedding and event planner where every guest RSVPs with a personal link.

## What's here

`index.html` is "The Yes", a scroll-driven story rendered like a camera rather than a 3D animation. Seven chapters:

1. The box: an emerald velvet ring box (gold seam bands, inner gold lip, clasp, hinge, foil monogram) opens on a walnut table, candles burning behind it
2. The yes: the ring rises out of the box
3. The noise: a family WhatsApp group floods the screen, messages drifting in and out of focus
4. The calm: the messages scatter and the ring turns in the light
5. The link: the camera pushes into the diamond, flares out, and a paper invitation appears
6. The count: a reception hall from above, with a live guest list beside it; every guest who says yes takes their seat in aso ebi and lights a candle
7. The dance: eye level on the dance floor, the couple and their guests dancing under moving lights, naira notes sprayed and foil confetti falling in front of the lens

After the film the page becomes the landing page: features, how it works, pricing (placeholder prices) and an early-access sign-up.

## How it is made to look real

Everything renders into a linear HDR buffer, then gets treated like light hitting a sensor:

- **Real light.** Materials are physically based and lit by a photographed ballroom (`assets/hall.exr`, the Poly Haven "hall" HDRI at 512×256, CC0, via `@pmndrs/assets`). Shadows are soft (VSM).
- **A real diamond.** The stone is a brilliant cut built as a convex hull, and a shader ray-traces light through it: refraction at IOR ~2.42, total internal reflection over up to six bounces, and a separate IOR per colour channel for fire. Sparkle comes from the actual light directions in the scene (key light, candles).
- **Real surfaces.** Velvet and linen use sheen with procedural weave and pile normal maps; platinum, gold and porcelain use clearcoat; rose petals, tablecloth folds and flower balls are shaped geometry, not textures.
- **A real lens.** Depth of field with a moving focus plane (the page opens out of focus and racks onto the box), bloom on highlights, slight barrel distortion, chromatic aberration at the edges, vignette, animated film grain, a little handheld drift, and a viewfinder readout of the current f-stop and focus distance.
- **A hall that is alive.** Emerald and wine table linens, draped walls washed by coloured uplights, moving-head beams sweeping the room, seated guests in gele and fila, dancers in agbada and iro, photographers' flashes, a four-tier cake by the head table.
- **Colour with contrast.** Emerald and champagne gold against near-black, graded with an S-curve, teal shadows and warm highlights.
- **Design living inside the photograph.** The brand is foil-stamped into the box's satin lining, the couple's monogram is projected onto the dance floor like a gobo light, headlines pull focus the way the lens does, and the chat bubbles sit at different depths with their own blur.

Three.js 0.169 is loaded as ES modules from jsDelivr through an import map. The story text and the RSVP card work without WebGL; the 3D layer plugs in when it can. Rendering resolution drops automatically if frames run long, and `prefers-reduced-motion` freezes grain, drift, flicker and the focus pull.

## Run it

The HDRI is loaded with `fetch`, so serve the folder rather than opening the file directly:

```
npx serve .
```

## Next

- Swap in a higher-resolution HDRI shot in a real Lagos event hall
- Add the soundtrack
- Build the real app (Next.js, Supabase, Resend)
