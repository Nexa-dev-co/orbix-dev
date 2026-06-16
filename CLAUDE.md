# CLAUDE.md — orbix

This file defines how code should be written, structured, and named in this codebase. Follow these rules in every suggestion, generation, and edit. This is a **pure frontend** Next.js project — no backend, no API routes, no database.

orbix is a cinematic, single-page **web-studio portfolio**: a long-scroll homepage composed of animated sections, gated behind an intro loading screen, plus an isolated **orbital-map navigation prototype** at `/prototype`.

---

## Stack

**Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS

**Animation & graphics:**
- `GSAP` + `ScrollTrigger` (via `@gsap/react`'s `useGSAP`) — scroll-driven reveals, character/text effects, timeline sequencing
- `Lenis` — smooth inertial scrolling, driven from the GSAP ticker so ScrollTrigger stays in sync
- `Three.js` — WebGL scenes (hero canvas, work-card canvas, the 3D orbital-map prototype)
- `ogl` — lightweight WebGL for shader-based effects (e.g. `ShaderTransition`)

**Icons:** `lucide-react`

**Dev tooling:** `lil-gui` — runtime tweak panels while tuning shaders/scenes (never shipped in a visible/default-on state)

There is **no** shadcn/ui, Framer Motion, form library, or validation library in this project. Don't introduce one without being asked.

---

## Design System — Tokens

These are the canonical design tokens, defined as CSS variables in `app/globals.css` and exposed to Tailwind via `tailwind.config.ts`. Use them everywhere. **Never hardcode a color.**

### Colors

```css
:root {
  --bg:     #060606;                      /* page background — near-black */
  --fg:     #ebe8e0;                       /* foreground text — warm off-white */
  --muted:  rgba(235, 232, 224, 0.38);     /* secondary / metadata text */
  --accent: #00e5ff;                       /* signature electric cyan — CTAs, highlights, selection */
  --border: rgba(235, 232, 224, 0.08);     /* hairline dividers, card borders */
  --card:   #0d0d0d;                       /* elevated surfaces / cards */
}
```

Tailwind exposes these as `bg-bg`, `text-fg`, `text-muted`, `bg-accent`, `border-border`, `bg-card`, etc. (see `tailwind.config.ts`). Prefer the Tailwind token classes over raw `var(--…)` in JSX, and use `var(--…)` directly in CSS / inline canvas styles.

### Typography

Two fonts, loaded via `next/font/google` in `app/layout.tsx` with `display: "swap"`:

```css
--font-syne     /* Syne   — display / headings (weights 700, 800) */
--font-dm-sans  /* DM Sans — body / UI         (weights 300, 400, 500) */
```

**Usage rules:**
- Display (Syne) → headings, hero text, section titles. Apply via the `font-display` Tailwind class or the `.font-display` helper.
- Body (DM Sans) → paragraphs, nav, labels. This is the `<body>` default.
- `.eyebrow` helper → small uppercased, letter-spaced kicker labels above headings.

---

## Loading Screen — Variant System

Every load of the site is gated behind a fullscreen intro loader. This is orchestrated by `components/effects/PageLoader.tsx`, which:

1. Paints an opaque `--bg` cover panel on the first frame / during SSR so there's no content flash.
2. Resolves **which** loader variant to play, then mounts it.
3. Unmounts once the active loader calls `onComplete`.

There are several interchangeable loader variants under `components/loaders/`, each implementing the shared `LoaderProps` contract (`{ onComplete: () => void }`) and each responsible for honouring `prefers-reduced-motion` (resolve fast / skip the animation):

| Key | Component | Idea |
|---|---|---|
| `orbital` | `OrbitalTypeLoader` | orbiting type forms into the wordmark |
| `kinetic` | `KineticLoader` | kinetic typography (current **default**) |
| `counter` | `CounterLoader` | percentage / counter count-up |
| `words` | `WordRevealLoader` | sequential word reveal |
| `curtain` | `CurtainLoader` | panel/curtain wipe reveal |
| `stroke` | `StrokeLoader` | SVG stroke-draw |
| `scramble` | `ScrambleLoader` | text-scramble settle |

The registry, stable order, and default live in `components/loaders/index.ts` (`LOADERS`, `LOADER_ORDER`, `DEFAULT_LOADER`). Pick a variant without code changes via the URL:

```
?loader=orbital | kinetic | counter | words | curtain | stroke | scramble
?loader=1..7     (by position in LOADER_ORDER)
?loader=random   (random each load)
```

When adding a loader: create `components/loaders/<Name>Loader/<Name>Loader.tsx` implementing `LoaderProps`, then register it in `index.ts` (add to `LOADERS`, `LOADER_ORDER`, and the `LoaderKey` union). Keep variant-specific constants named at the top of the file, never inline.

---

## Project Structure

Single homepage; sections are imported and composed **directly** in `app/page.tsx` — there is **no `View` wrapper component** between a page and its sections.

```
app/
  layout.tsx          # root layout — fonts, PageLoader, CustomCursor, SmoothScroll, Grain, global CSS
  globals.css         # design tokens + base/typography/cursor/marquee/transition CSS
  page.tsx            # homepage — composes the sections directly
  prototype/
    page.tsx          # /prototype — orbital-map nav prototype (3D default, ?view=2d fallback)

components/
  layout/             # Navbar, Footer
  sections/           # homepage sections — Hero, Marquee, Statement, WorkGrid, Process, CtaBanner
  effects/            # PageLoader, SmoothScroll, CustomCursor, Grain, ShaderTransition
  canvas/             # Three.js canvases — HeroCanvas, WorkCardCanvas
  loaders/            # intro loader variants + index.ts (registry) + types.ts (LoaderProps)
  ui/                 # small reusable primitives — MagneticButton, SectionDivider
  prototype/          # orbital-map prototype (kept isolated from the live site)
    OrbitMap          # 2D SVG version
    orbit/            # 3D WebGL version — scene, config, sections, journey, shaders, HUD, panel

lib/
  hooks/
    useGsap.ts        # scoped GSAP runner (useGSAP) + prefersReducedMotion helper
    useLenis.ts       # single Lenis instance, driven from the GSAP ticker
  splitChars.tsx      # SplitChars — wraps each glyph in <span class="char"> for per-letter animation

public/
  textures/           # image assets (e.g. planet textures for the prototype)
```

### Component file convention

- **Each component lives in its own folder named after it**, containing its `.tsx` (and any co-located files it owns — CSS, sub-parts, local config). For example `components/sections/Hero/Hero.tsx`, not a loose `components/sections/Hero.tsx`.
- The category folders (`layout`, `sections`, `effects`, `canvas`, `loaders`, `ui`, `prototype`) stay as grouping; the per-component folder sits inside its category.
- Co-locate everything a component owns with it; only promote something to `lib/` when it's shared across components.

---

## Page-by-Page Notes

### Homepage (`/`)
Long-scroll composition rendered by `app/page.tsx`, in order:
`ShaderTransition` → `Navbar` → `Hero` → `Marquee` → `Statement` → `WorkGrid` → `Process` → `CtaBanner` → `Footer`, with `SectionDivider` between sections.
- `Hero` uses a Three.js WebGL canvas background + headline with per-character GSAP reveal (`SplitChars`).
- `Marquee` is a pure-CSS infinite scroll (see `.marquee` in `globals.css`), pausing on hover.
- Section reveals use GSAP `ScrollTrigger` via the scoped `useGsap` hook.

### Prototype (`/prototype`)
An orbital-map navigation concept, **isolated from the live site**.
- Default is the **3D** WebGL map (`components/prototype/orbit`), loaded via `next/dynamic` with `ssr: false` so `three` stays out of the server graph.
- `?view=2d` renders the 2D SVG alternative (`components/prototype/OrbitMap`).
- Don't let prototype code leak into the homepage bundle.

---

## Naming Rules

### Variables & Parameters

**Never use abbreviations.** Names must describe exactly what the value is.

```ts
// ❌ Wrong
const p = req.params;
const u = await getUser(id);
const fn = (e: Event) => {};

// ✅ Correct
const routeParams = req.params;
const currentUser = await getUserById(userId);
const handleSubmit = (event: Event) => {};
```

### Files

- **`.tsx` files → PascalCase**, named after what they render: `Hero.tsx`, `WorkGrid.tsx`, `MagneticButton.tsx`, `OrbitalTypeLoader.tsx`. A `.tsx` file that exports a component is named after that component (e.g. a file exporting `SplitChars` is `SplitChars.tsx`).
- **`.ts` files** keep their idiomatic casing:
  - **hooks** → `camelCase`, verb-first: `useGsap.ts`, `useLenis.ts`.
  - **utilities / config / data** → `camelCase`, describing what the file does or contains: `formatDate.ts`, `parseFormValues.ts` — never `utils.ts` / `helpers.ts` / `misc.ts`.

### Hooks

Verb-first, action-describing names:

```ts
useGsap()   // scoped GSAP runner + prefers-reduced-motion gate
useLenis()  // Lenis smooth-scroll lifecycle, synced to the GSAP ticker
```

### Components

PascalCase, named after what they render: `Hero` / `MagneticButton` / `PageLoader` / `SectionDivider`.

---

## Exports

- **Pages & components** → `default export`
- **Hooks, utils, lib, types, registries** → `named export`
- **Next.js `page.tsx` and `layout.tsx`** → always `default export` (required)

---

## Animation Philosophy

Every animation must feel **purposeful and cinematic**, not decorative.

Rules:
1. **The intro loader gates the site.** Don't bypass it with code edits; compare variants with the `?loader=` URL param.
2. **Scroll reveals use GSAP `ScrollTrigger`** via the scoped `useGsap` hook — not hand-rolled Intersection Observers. This keeps animation logic centralized and auto-cleaned on unmount.
3. **Lenis wraps the entire scroll.** It's initialised once (`useLenis`) and driven from the GSAP ticker; ScrollTrigger updates on its `scroll` event. Don't spin up a second scroll loop.
4. **WebGL canvases render behind content.** Never block scroll or pointer events.
5. Animations respect `prefers-reduced-motion`. Use the shared helper — `useGsap`'s scoped runner already bails out when reduced motion is requested, and `useLenis` falls back to native scroll:

```ts
import { prefersReducedMotion } from "@/lib/hooks/useGsap";

if (!prefersReducedMotion()) {
  // run decorative GSAP / WebGL motion
}
```

---

## Comments

Comments explain **why**, not what.

```ts
// ❌ Obvious
// Brighten the particle
brightness *= 1.5;

// ✅ Explains why
// Particles brighten as they lock in so the formed shape "pops" — this is what
// makes the reveal read as building, not just arriving
brightness *= 1.0 + gatherRaw * FORM_BRIGHTNESS_BOOST;
```

For multi-step complex functions (especially animation timelines), number the steps:

```ts
// 1. Intro — elements fade in / settle (anticipation)
// 2. Build — staggered reveal ramps in
// 3. Resolve — final polish, then hand off / reveal the site
```

---

## TypeScript

- Prefer `interface` for object shapes, `type` for unions and computed types.
- No `any`. Use `unknown` and narrow it.
- Type shared contracts explicitly and export them (e.g. `LoaderProps` in `components/loaders/types.ts`); derive registry key unions from them (`LoaderKey`).
- Generic hooks should be parameterised over the element type where it helps callers (e.g. `useGsap<HTMLElement>()`).

---

## General Rules

- No magic numbers. Named constants only — declare them at the top of the file, never inline.
- No commented-out code left in commits.
- Import order: external packages → internal aliases (`@/`) → relative imports.
- `'use client'` only where strictly necessary. Prefer Server Components for static markup; Client Components for animation-heavy or interactive sections.
- Three.js / WebGL imports are **dynamic** (`next/dynamic` with `ssr: false`) when they'd otherwise enter the server graph — they can't run on the server.
- Keep prototype code (`components/prototype/`, `/prototype`) isolated from the live homepage bundle.
