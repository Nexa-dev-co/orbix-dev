# Services Deck — Current State & Tuning

> Living handoff doc for the homepage **Services** section (now a **landing-pad carousel**).
> Hand this to a fresh chat to bring it up to speed. For the original build rationale see
> [`services-deck-plan.md`](./services-deck-plan.md).

## What it is

A **single-pad carousel** on the homepage, after the hero. One spacecraft sits on a central
landing pad (`space_landing.glb`) under a starfield; the four service names run along the
bottom as a strip. The section **pins** while you scroll: each scroll notch snaps to the next
craft (the current one flies off the pad, the next flies on); after the last it unpins and the
page continues. You can also **drag the craft** to rotate it (it springs back on release) and
**flick it horizontally** to switch, or **click a name** in the strip to jump to a craft.

**Files** (`components/sections/ServicesDeck/`):
- `ServicesDeck.tsx` — section markup, `activeIndex` state, carousel strip, detail panel
- `deckServices.ts` — the four services + **per-ship colors** (see below)
- `DeckCanvas/DeckCanvas.tsx` — canvas wrapper + loading; props `{ activeIndex, onFlick }`
- `hooks/useServicesDeck.ts` — the Three.js scene (starfield, pad, one craft, swap, drag)
- `hooks/useDeckCarousel.ts` — pins the section, snaps scroll to each craft, owns `activeIndex`,
  exposes `goTo(index)` (used by label clicks + ship flicks via `ScrollToPlugin`)
- Styles: `.deck-*` / `.services-deck` block in `app/globals.css`
- Models: Draco-compressed `.glb` in `public/models`; decoder in `public/draco`; raw sources in
  `models-src/` (re-optimize with gltf-transform — see [`services-deck-plan.md`](./services-deck-plan.md))

> Retired in the refactor: `useDeckReveal.ts` and `useDeckSnap.ts` (the old `-100vh` overlap +
> guard-reveal + snap-assist) — replaced by the clean pinned section in `useDeckCarousel.ts`.

## Ship identities — graded palettes  ← edit `profile` in `deckServices.ts`

Each hull is **re-graded onto its own palette** instead of washed to one flat hue. The model's own
albedo *luminance* drives a three-tone map (`shadow` → `hull` → `highlight`), so panels, recesses,
and bright faces stay distinct — the ship reads as a real, multi-material machine, never one solid
colour. On top of that the brightest texels (engines/windows) are picked out as an `accent` glow
that feeds the bloom pass, and the silhouette catches a thin fresnel `rim`. The model's
normal/roughness/metalness maps are left untouched, so the PBR realism survives the recolour. This
all lives in `hullMaterial.ts` (`applyHullMaterials` → `createHullMaterial` → `applyGradedHull`).

Each `profile` is fully independent (no shared values). Fields: `shadow / hull / highlight / accent
/ rim` (hex), `metalness / roughness / clearcoat / clearcoatRoughness`, `iridescence (+ IOR)`,
`gradeMid` (shadow→highlight pivot), `emitThreshold / emitStrength` (the glow pickout), `envIntensity`.

| # | Service | identity | hull | accent (glows) | finish | Model |
|---|---|---|---|---|---|---|
| 01 | Web Experiences | Ember Noir | full black `#060606` | faint red rim `#4a0f13` | matte; near-neutral light | `spaceship.glb` |
| 02 | Mobile Systems | Deep Navy | navy `#14233f` | cool white `#cfe0f5` | matte; reddish key light | `spaceship3.glb` |
| 03 | Enterprise Platforms | Gunmetal | gunmetal `#3a4856` | **warm amber `#ffb24d`** | brushed metal | `cargo_spaceship.glb` |
| 04 | Artificial Intelligence | Legacy (original) | purple `#7a4ad0` | — (no accent glow) | flat two-tone tint | `star_aventure_spaceship_starship_fighter.glb` |

> Ships 01–03 use the **graded** treatment. **Ship 04 is the original pre-overhaul look** — a flat
> two-tone tint (`LegacyProfile`: `colorCore` purple `#7a4ad0` → `colorEdge` cyan `#36e6ff`, native
> metalness/roughness, no graded palette/clearcoat/iridescence), kept on request. The treatment is
> chosen per ship by `profile.kind` (`'graded'` default / `'legacy'`); see `hullMaterial.ts`.
>
> The graded ships are deliberately **low-gloss** (matte/painted metal: low `metalness`, higher
> `roughness`, light `clearcoat`, reduced `envIntensity` ≈0.4–0.7 so the studio env doesn't read as
> mirror reflections; ships 01 + 02 are the least reflective at `envIntensity` 0.4 / `metalness` 0.25).
> Upgrade to `MeshPhysicalMaterial` is skipped on the low-power path; the grade
> still applies. The `?tune` panel exposes `metalness / roughness / clearcoat / envMapIntensity` for
> live tuning (graded ships; legacy ship 04 only responds to metalness/roughness).

> **Dial it in live:** open the deck with `?tune` for a `lil-gui` panel exposing the centred ship's
> palette/PBR + the bloom (strength/radius/threshold). Tune by eye, then bake the values back into
> `deckServices.ts` / the constants. The panel never loads without the flag.

## Tuning knobs

### Hull brightness / glow — `useServicesDeck.ts` (`── Powered-on look ──` / `── Engine glow pulse ──`)
| Constant | Value | Effect |
|---|---|---|
| `DORMANT_BRIGHTNESS` | `0.4` | hull brightness as a craft **leaves** the pad |
| `ACTIVE_BRIGHTNESS` | `1.0` | hull brightness on the **centred** craft |
| `LIT_EMISSIVE_INTENSITY` | `1.3` | any **native** emissive map's intensity when centred |
| `EMIT_PULSE_AMPLITUDE` / `_SPEED` | `0.22` / `1.6` | engine-glow breathing on the centred craft |

> The old `FRESNEL_POWER` is gone; the rim now lives in `hullMaterial.ts` as `RIM_POWER` / `RIM_STRENGTH`,
> in the per-ship `rim` colour.

### Bloom + per-ship rim light — `useServicesDeck.ts`
`BLOOM_STRENGTH` `0.85` (`_LOW` `0.5` on weak devices) · `BLOOM_RADIUS` `0.5` · `BLOOM_THRESHOLD` `0.7`
(only the bright accents/highlights bleed) · `BLOOM_MSAA_SAMPLES` `4` (composer-target MSAA, since
`antialias:true` is ignored once a composer renders). Pipeline: `RenderPass → UnrealBloomPass →
OutputPass`.

**Per-ship lighting** (`applyShipLighting`, `RIM_LIGHT_TWEEN` `0.5`s): on each swap the **rim light**
eases to the ship's `rim` colour, and the **key light** eases to the ship's optional `light`
override (`{ color, intensity? }` in `deckServices.ts`) — so each craft feels lit for itself. Ships
that omit `light` keep the default warm key (`KEY_LIGHT_COLOR` / `KEY_LIGHT_INTENSITY`). Current
overrides: **01 Ember Noir** → near-neutral warm key `#c9c2bc` + neutral fill `#4a4644` (so the black
hull reads black, not red-washed); **02 Deep Navy** → reddish `#ff5e47` (warm/cool contrast
against the navy hull). **03 / 04** omit it (unchanged warm key). A `light.fill` override (per-ship
fill colour) and a `modelRotation` (per-ship base rotation, in degrees) are also available — ship 04
uses `modelRotation: { x: -180 }` to flip its mis-oriented hull.

### Low-power path — `useServicesDeck.ts`
`LOW_POWER_MAX_WIDTH` `760`. Coarse pointer **or** viewport narrower than this → keep
`MeshStandardMaterial` (skip clearcoat/iridescence), softer bloom, no MSAA. The grade/accent/rim
still apply, so the look stays consistent — just cheaper. Reduced motion additionally drops the
idle animation (float bob + turntable spin + engine pulse).

### Idle animation (centred craft) — `useServicesDeck.ts`
The centred craft continuously **floats** up/down (`FLOAT_AMPLITUDE` `0.1` · `FLOAT_SPEED` `1.1`),
**spins** slowly like a turntable (`AUTO_ROTATE_SPEED` `0.35` rad/s on `lift.rotation.y`, paused
while dragging so manual rotate stays precise), and its engines **breathe**
(`EMIT_PULSE_AMPLITUDE` / `_SPEED`). Parked/off-stage craft don't animate. All of it is gated behind
reduced motion.

### Landing pad + stars — `useServicesDeck.ts`
`PAD_TARGET_WIDTH` `5.0` (pad footprint) · `PAD_Y_OFFSET` `0.6` (raise pad so its platform comes up
under the craft — the model's bbox is taller than the visible deck) · `SHIP_HOVER` `0.05` (height
the craft sits above the pad) · `TARGET_SIZE` `2.3` (craft scale). **Pad colour:** `PAD_COLOR`
`0x16222b` (dark slate, multiplies the texture) · `PAD_EMISSIVE_COLOR` `0x0b3a45` /
`PAD_EMISSIVE_INTENSITY` `0.55` (faint cyan glow in the recesses). Stars: `STAR_COUNT` `1200` ·
`STAR_INNER/OUTER_RADIUS` `18`/`60` · `STAR_SIZE` `0.16` · `STAR_DRIFT` `0.006`.

### Carousel swap (sequenced) — `useServicesDeck.ts` (`── Carousel swap ──`)
The outgoing craft **fully clears the pad before** the incoming one arrives (no collision at
centre): `SWAP_OUT_DURATION` `0.5` (exit) · `SWAP_GAP` `0.06` (empty beat) · `SWAP_IN_DURATION`
`0.62` (entrance, arrives at `enterDelay = OUT + GAP`). Each banks + warps scale for flair:
`SWAP_OFFSET_X` `3.6` · `SWAP_OFFSET_Y` `0.55` · `SWAP_BANK` `0.5` (roll) · `SWAP_ENTER_SCALE` `0.6`
· `SWAP_EXIT_SCALE` `0.7`. Direction decides which side each enters/leaves from.

### Drag-to-rotate + flick — `useServicesDeck.ts` (`── Drag-to-rotate + flick ──`)
`DRAG_YAW_SENSITIVITY` `0.006` rad/px · `DRAG_PITCH_SENSITIVITY` `0.004` · `DRAG_YAW_CLAMP` `1.0`
· `DRAG_PITCH_CLAMP` `0.45` · `SPRING_DURATION` `0.9` (ease back on release, `elastic.out`) ·
`FLICK_DISTANCE_PX` `110` (horizontal travel past this, and horizontally dominant, = a switch).

### Pin & cycle — `useDeckCarousel.ts`
`VIEWPORTS_PER_STEP` `1` (scroll height between adjacent craft → `end: '+=300%'` for four) ·
`REVEAL_DURATION` `0.6` (fade the stage in at pin-start) · `HIDE_DURATION` `0.4` (fade the stage
out on `onLeaveBack` — scrolling up out of the section; the reveal replays on re-entry) ·
`GOTO_DURATION` `0.6` (programmatic scroll on label/flick) · `SNAP_DURATION` `0.5` (settle onto the
nearest craft) · `REVEAL_FALLBACK_MS` `7000`. Trigger creation is gated behind the hero
`REVEAL_EVENT` + a rAF + `ScrollTrigger.refresh()`. The section is pulled up `margin-top:-100vh`
(globals.css) so its pin begins where the hero's pin ends — no empty black scroll between them.

### Framing / lighting — `useServicesDeck.ts`
`CAMERA_*` (FOV `34`, distance `8.2`, height `1.7`, look-Y `0.75`) · `TARGET_SIZE` `2.3` (hull
scale) · `BASE_YAW` `-0.6` (resting 3/4 view) · `KEY_LIGHT_*` (warm `#fff2e2`, `2.4`) ·
`FILL` / `RIM` (`0.8`, recoloured per ship) / `AMBIENT` · `TONE_MAPPING_EXPOSURE` `1.18`
(**Neutral** tone mapping). Environment reflection strength is now **per ship** (`profile.envIntensity`).

### Sun (hero) — `lib/hooks/useHeroAnimation.ts`
`SUN_SCROLL_SCALE` `1.1` (size) · `SUN_SCROLL_RISE` `200` (px raised above the square center).

## How the key behaviors work (brief)

- **Reveal:** the section is a normal-flow pinned block right after the hero (pulled up
  `margin-top:-100vh` to sit over the hero's tail), with a solid `--bg` backdrop. As you scroll in,
  the black panel fills and pins (`start: 'top top'`); at pin-start `onEnter` fades the canvas +
  overlay in (`REVEAL_DURATION`) **and dispatches `DECK_REVEAL_EVENT`** → `useServicesDeck`
  replays the centred craft's full entrance (`replayEntrance`). Gated behind `REVEAL_EVENT` so it
  builds after the hero pin exists.
- **Scroll-up hide + replay:** scrolling back up out the top (`onLeaveBack`) fades the section out
  over `HIDE_DURATION` (0.4 s) and flips the `hasRevealed` latch, so scrolling back down replays
  the whole reveal (DOM fade + the craft's warp-in) from scratch.
- **Pin & cycle:** while pinned, scroll progress 0→1 maps across the four craft with `snap`;
  `onUpdate` rounds progress to an index and sets `activeIndex` (React de-dupes, so it only
  re-stages on a crossing). After the last craft the pin releases and the page continues.
- **Swap:** changing `activeIndex` flies the current craft off the pad and the next one on
  (`SWAP_*`), dimming/fading the one that leaves.
- **Drag:** pointer-down on the canvas grabs the centred craft; dragging rotates it (clamped). On
  release a big horizontal flick (`FLICK_DISTANCE_PX`) calls `onFlick` → `goTo(±1)`; otherwise it
  springs back to the resting view. `goTo` scrolls the page to that craft's snap point, so **scroll
  stays the single source of truth**.
- **Strip:** the four names along the bottom; the active one is lit; clicking one → `goTo(i)`.

## Open / next
- **Touch:** drag-to-rotate uses pointer events (works with mouse). On touch, the pin still cycles
  via scroll and labels still tap, but rotate-vs-scroll on the same surface isn't tuned yet.
- **Seam:** confirm there's no sliver between the hero unpin and the deck pin; tune `end` / the
  hero pin length if a gap shows.
- Reduced motion: instant swaps, no drag/float; scroll-cycle (pin/snap) + label clicks still switch.
