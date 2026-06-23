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

## Ship colors  ← edit these in `deckServices.ts`

Each hull is a **two-color fresnel mix**: `colorCore` where the hull faces the camera,
`colorEdge` at grazing/edge angles. The centred craft sits **bright**; a craft leaving the pad
dims back as it fades. Hex strings.

| # | Service | `colorCore` (faces camera) | `colorEdge` (edges) | Model |
|---|---|---|---|---|
| 01 | Web Experiences | `#2f6ad0` (blue) | `#22ecff` (cyan) | `spaceship.glb` |
| 02 | Mobile Systems | `#1aa79c` (teal) | `#6cf2d0` (mint) | `spaceship3.glb` |
| 03 | Enterprise Platforms | `#4a6a9a` (steel) | `#9fe6ff` (light cyan) | `cargo_spaceship.glb` |
| 04 | Artificial Intelligence | `#7a4ad0` (purple) | `#36e6ff` (cyan) | `star_aventure_spaceship_starship_fighter.glb` |

> The carousel shows one craft at a time, so every bay gets a **distinct** hull (AI was moved off
> the duplicate `spaceship3.glb`). The mix multiplies the model's own texture (detail stays; hue shifts).

## Tuning knobs

### Hull color / brightness — `useServicesDeck.ts` (`── Powered-on look ──`)
| Constant | Value | Effect |
|---|---|---|
| `DORMANT_BRIGHTNESS` | `0.5` | brightness of a craft as it **leaves** the pad |
| `ACTIVE_BRIGHTNESS` | `1.2` | brightness of the **centred** craft |
| `FRESNEL_POWER` | `2.2` | ↑ edge color hugs the silhouette; ↓ spreads it across the hull |
| `LIT_EMISSIVE_INTENSITY` | `1.3` | the craft's **internal** lights when centred |

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
`CAMERA_*` (FOV `34`, distance `8.2`, height `1.7`, look-Y `0.75`) · `TARGET_SIZE` `1.7` (hull
scale) · `BASE_YAW` `-0.6` (resting 3/4 view) · `KEY_LIGHT_*` (warm `#fff2e2`, `2.6`) ·
`FILL/RIM/AMBIENT` · `ENV_MAP_INTENSITY` `1.2` · `TONE_MAPPING_EXPOSURE` `1.18` (**Neutral** tone mapping).

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
