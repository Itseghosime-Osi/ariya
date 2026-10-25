# Àríyá

In-house experiment for Tech4Youth Edo, Module 06, Project 36: a wedding and event planner where every guest RSVPs with a personal link. Formerly "OwambePlan". Àríyá (ah-ree-YAH) is Yoruba for merriment, the spirit of an owambe.

## What's here

`index.html` is the landing page. It opens on "The Yes", a wedding archive in eight chapters rendered like a camera rather than a 3D animation, then becomes the company's site.

0. **Gate.** "Enter the wedding" starts the soundtrack; "Enter in silence" skips it. The hall loads behind the gate.
1. **Prologue.** A drifting, out-of-focus establishing shot: how the couple met at someone else's owambe.
2. **The box.** An emerald velvet ring box (gold seam bands, inner gold lip, clasp, three-knuckle hinge, piping, foil monogram) opens on a walnut table, candles behind it. The brand sits at the top of the satin lid lining, clear of the ring.
3. **The yes.** The ring rises; the diamond throws real fire.
4. **The noise.** A family WhatsApp group floods the screen, messages drifting in and out of focus, with notification pings in the score.
5. **The calm.** The messages scatter and the ring turns in the light.
6. **The invitation.** The camera dives into the diamond and flares out to a paper envelope addressed to the guest. Tap the wax seal: the flap lifts and the card slides out to RSVP.
7. **The count.** The reception hall from above in ivory, gold and candlelight, with a live guest list. Each guest who says yes takes a seat in emerald-and-gold aso ebi and lights a candle.
8. **The dance.** The couple and guests dancing under warm moving lights, naira notes sprayed, foil confetti falling in front of the lens.

After the film: what Àríyá does, the occasions it plans, the tools, how it works, pricing (placeholder prices) and an early-access sign-up. The menu doubles as the archive index.

## Sound

The soundtrack is generated live with the Web Audio API, so there are no audio files. It is a highlife-leaning ambient loop at 100 BPM (Fmaj9, Bbmaj7, C6/9, Am7) with pads, a highlife guitar figure, bass, shaker, agogo bell, talking drum and kick. Layers enter and leave with the story: the noise chapter muffles the band under WhatsApp pings, the hall brings in the drums, the dance brings the kick. It only starts after a click, pauses when the tab is hidden, and the nav has a sound toggle.

## How it is made to look real

Everything renders into a linear HDR buffer, then gets treated like light hitting a sensor:

- **Real light.** Physically based materials lit by a photographed ballroom (`assets/hall.exr`, the Poly Haven "hall" HDRI at 512×256, CC0, via `@pmndrs/assets`). Soft VSM shadows.
- **A real diamond.** A brilliant cut built as a convex hull and ray-traced in a shader: refraction at IOR ~2.42, total internal reflection over up to six bounces, and a separate IOR per colour channel for fire. Sparkle comes from the actual light directions in the scene.
- **Real surfaces.** Velvet, satin and linen use sheen with procedural normal maps; walnut, platinum, gold and porcelain use clearcoat; petals, tablecloth folds, flower balls, gele and agbada are shaped geometry.
- **A real lens.** Depth of field with a moving focus plane, bloom, slight distortion, chromatic aberration, vignette, film grain, handheld drift, and a viewfinder readout of the current f-stop and focus distance.
- **A hall that is alive.** Draped walls washed by warm uplights, moving-head beams, chandeliers, a fairy-light wall, seated guests who appear as they RSVP, dancers, photographers' flashes, a four-tier cake.
- **Colour with contrast.** Emerald and champagne gold against near-black, graded with an S-curve, teal shadows and warm highlights.
- **Design inside the photograph.** The brand is foil-stamped into the satin lining, the couple's monogram is projected onto the dance floor like a gobo light, headlines pull focus the way the lens does.

Three.js 0.169 loads as ES modules from jsDelivr through an import map. The story text, envelope and RSVP work without WebGL. Rendering resolution drops automatically if frames run long, and `prefers-reduced-motion` freezes grain, drift, flicker and the focus pull.

## Run it

The HDRI is loaded with `fetch`, so serve the folder rather than opening the file directly:

```
npx serve .
```

## Next

- Engrave the guest's typed name inside the ring band for the final shot
- A photogrammetry scan of a real Lagos or Benin event hall
- Filmed dancers on the dance floor
- A lighter mode for mid-range Android phones
- Build the real app (Next.js, Supabase, Resend)
