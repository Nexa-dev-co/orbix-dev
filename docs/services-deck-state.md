# Services Deck — Current State & Tuning

> Living handoff doc for the homepage **Services** section (the four-craft "fleet deck").
> Hand this to a fresh chat to bring it up to speed. For the original build rationale see
> [`services-deck-plan.md`](./services-deck-plan.md).

## What it is

A landing **deck** of four spacecraft on the homepage, after the hero. Each ship maps to a
service. Dormant ships sit dark on the deck; **hovering** lights a ship, **clicking** powers
it up (steps forward, floats, tracks the mouse, reveals a description). The section reveals
on the hero's black-square fill, and hides itself when you scroll back up.

**Files** (`components/sections/ServicesDeck/`):
- `ServicesDeck.tsx` — section markup, state, label grid, description panel
- `deckServices.ts` — the four services + **per-ship colors** (see below)
- `DeckCanvas/DeckCanvas.tsx` — canvas wrapper + loading
- `hooks/useServicesDeck.ts` — the Three.js scene (ships, lighting, hover/active, reveal)
- `hooks/useDeckReveal.ts` — scroll reveal + scroll-hide fade (DOM side)
- `hooks/useDeckSnap.ts` — auto-scroll assist into the section
- Styles: `.deck-*` / `.services-deck` block in `app/globals.css`
- Models: Draco-compressed `.glb` in `public/models`; decoder in `public/draco`

## Ship colors  ← edit these in `deckServices.ts`

Each hull is a **two-color fresnel mix**: `colorCore` where the hull faces the camera,
`colorEdge` at grazing/edge angles. Same colors in both states — **dark when dormant,
bright when powered on** (brightness is global, see knobs). Hex strings.

| # | Service | `colorCore` (faces camera) | `colorEdge` (edges) |
|---|---|---|---|
| 01 | Web Experiences | `#2f6ad0` (blue) | `#22ecff` (cyan) |
| 02 | Mobile Systems | `#1aa79c` (teal) | `#6cf2d0` (mint) |
| 03 | Enterprise Platforms | `#4a6a9a` (steel) | `#9fe6ff` (light cyan) |
| 04 | Artificial Intelligence | `#7a4ad0` (purple) | `#36e6ff` (cyan) |

> These are starting palettes, tuned per ship over time. Change any hex to retune. The mix
> multiplies the model's own texture (so texture detail stays; hue shifts).

## Tuning knobs

### Hull color / brightness — `useServicesDeck.ts` (`── Powered-on look ──`)
| Constant | Value | Effect |
|---|---|---|
| `DORMANT_BRIGHTNESS` | `0.5` | how dark the **off** state is (↓ darker) |
| `ACTIVE_BRIGHTNESS` | `1.2` | how bright the **on** state is |
| `FRESNEL_POWER` | `2.2` | ↑ edge color hugs the silhouette; ↓ spreads it across the hull |
| `LIT_EMISSIVE_INTENSITY` | `1.3` | brightness of the ship's **internal** lights when on |
| `LIGHT_RAMP_DURATION` | `0.5` | seconds to fade dormant ↔ active |

> Activation changes **only the ship** — its material mix darkens/brightens and its internal
> emissive ("lights inside the ship") ramps. No external lamp; the hull is lit **from above**
> by the shared key light.

### Stage / dormant lighting — `useServicesDeck.ts` (`── Lighting ──`)
`KEY_LIGHT_COLOR` (warm `#fff2e2`) / `KEY_LIGHT_INTENSITY` `2.6` · `FILL_LIGHT_*` (neutral) ·
`RIM_LIGHT_*` (cyan accent `0.7`) · `AMBIENT_INTENSITY` `0.16` · `ENV_MAP_INTENSITY` `1.2` ·
`TONE_MAPPING_EXPOSURE` `1.18` (renderer uses **Neutral** tone mapping for truer color).

### Framing / motion — `useServicesDeck.ts`
`TARGET_SIZE` `1.7` (hull scale) · `BASE_YAW` `-0.6` (resting 3/4 view) · `FORWARD_STEP` `1.1`
· `ACTIVE_LIFT` `0.35` · `ACTIVE_SCALE` `1.12` · `DIM_PRESENCE` `0.32` (how dark non-active
ships go) · `FLOAT_AMPLITUDE`/`FLOAT_SPEED` · `MOUSE_TRACK_YAW`/`_PITCH`.

### Entrance (replays on every entry) — `useServicesDeck.ts`
- `SHIP_REVEAL_DURATION` `1.6` (slower, cinematic) · `SHIP_REVEAL_STAGGER` `0.28`.
- `SHIP_INTROS` — per-ship start offsets (index-matched to the services); each hull eases back
  to rest from its own move: **Web** glides in from the left, **Mobile** drops from above,
  **Enterprise** surges up from depth (scaling in), **AI** banks in from the right with a turn.
  Animated on a dedicated `intro` group so it never fights the float / mouse-track.

### Reveal guard + scroll-hide — `useDeckReveal.ts`
- The entrance **replays every time** you scroll into the section (not once).
- `GUARD_THRESHOLD` `'top 20%'` — guard line: scroll down past it → entrance; scroll up past
  it → the whole deck fades out.
- `HIDE_DURATION` `0.4` — seconds for that smooth fade-out.

### Snap-in assist — `useDeckSnap.ts`
`SNAP_IDLE_MS` `700` · `SNAP_ZONE_VIEWPORTS` `1.0` · `SNAP_DURATION_MS` `850`.

### Sun (hero) — `lib/hooks/useHeroAnimation.ts`
`SUN_SCROLL_SCALE` `1.1` (size) · `SUN_SCROLL_RISE` `200` (px raised above the square center).

## How the key behaviors work (brief)

- **Reveal:** the deck is pulled up one viewport (`margin-top:-100vh`) to overlap the hero's
  tail, and stays fully hidden (canvas + backdrop + text) until the hero's black square fills.
  The guard trigger is **gated behind `REVEAL_EVENT`** so it can't fire during the intro.
  Crossing `GUARD_THRESHOLD` downward plays the entrance — the labels stagger in and the four
  ships each fly in from their own direction (`DECK_REVEAL_EVENT` → `useServicesDeck`,
  `SHIP_INTROS`). **This replays on every entry.**
- **Scroll-hide:** crossing the same guard upward fades the whole section out over
  `HIDE_DURATION` — the deck shows only while you're at it.
- **Snap:** if you stall in the last viewport before the deck, it eases you in; disabled once
  revealed and under reduced motion.
- **Hover/active:** single-active (radio). Hover lights a ship; click powers it up + reveals
  its description; re-click powers down.

## Open / next

- **Color pass is iterative** — Web Experiences tuned against screenshots; the other three
  ships' palettes are reasonable defaults, still to be refined the same way.
- Reduced motion is handled throughout (no float/step/snap; reveal + hide still work).
