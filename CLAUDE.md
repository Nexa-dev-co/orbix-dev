# CLAUDE.md

## Project Overview

Project Name: Orbix

Orbix is a premium software company specializing in:

- Custom Web Applications
- SaaS Platforms
- Enterprise CRM Systems
- Mobile Applications
- AI Solutions
- Digital Product Design

The name "Orbix" originates from orbital systems, gravitational movement, celestial mechanics, and interconnected ecosystems.

The website is not a marketing page.

The website itself must be a demonstration of Orbix's capabilities.

Every interaction, animation, transition, and visual element should communicate:

- Innovation
- Technical Excellence
- Precision Engineering
- Premium Quality
- Future Thinking

---

# Primary Objective

The goal of this project is not merely to build a beautiful website.

The goal is to create a website that can realistically compete on Awwwards.

Every design decision, animation, interaction, layout, component, and piece of content must be evaluated against this question:

"Would this feel impressive when compared against recent Awwwards winners?"

If the answer is no:

Do not implement it.

Instead propose something more original, memorable, immersive, or technically impressive.

---

# Creative Principles

## Principle 1: Avoid Generic Agency Design

Never generate:

- Generic hero sections
- Generic gradient backgrounds
- Generic floating cards
- Generic feature grids
- Generic SaaS landing page layouts
- Generic Framer-style templates
- Generic startup aesthetics

If a section resembles a typical agency website:

Reject it.

---

## Principle 2: Create Experiences, Not Pages

Every section should feel like an experience.

Examples:

- Orbital systems reacting to cursor movement
- Dynamic 3D worlds
- Interactive storytelling
- Scroll-driven transformations
- Immersive scene transitions
- Cinematic camera movements
- Environmental effects
- Particle systems
- Physics-driven interactions

The website should feel alive.

---

## Principle 3: Motion First

Motion is a core design language.

Every transition should have intention.

Avoid:

- Basic fade-ins
- Basic slide-ins
- Generic scroll reveals

Prefer:

- Morphing objects
- Spatial transitions
- Depth-based movement
- Camera travel
- Object transformation
- Procedural animation

Motion should communicate meaning.

---

## Principle 4: Use 3D Purposefully

3D should not be decoration.

Every 3D element must support the narrative.

Potential themes:

- Orbiting systems
- Planetary mechanics
- Connected ecosystems
- Data universes
- Artificial intelligence structures
- Digital galaxies
- Abstract technological architectures

3D must feel premium and cinematic.

---

## Principle 5: Design for Emotional Impact

Users should experience:

1. Curiosity
2. Wonder
3. Engagement
4. Trust
5. Excitement

The site should create moments that users want to share.

---

# Awwwards Evaluation Framework

Before implementing any feature, score it from 1-10 in the following categories:

## Creativity

Is it original?

## Innovation

Have users seen this before?

## Interaction

Does it create engagement?

## Visual Design

Does it look premium?

## Motion

Does animation elevate the experience?

## Technical Excellence

Does it demonstrate advanced engineering?

## Memorability

Will users remember it tomorrow?

Any concept scoring below 8 in any category should be redesigned.

---

# Orbix Brand Personality

Orbix is:

- Visionary
- Intelligent
- Precise
- Premium
- Futuristic
- Confident

Orbix is not:

- Corporate
- Boring
- Generic
- Minimal for the sake of minimalism
- Trend-following

Orbix should feel like a company that builds the future.

---

# Technical Standards

Framework:

- Next.js
- TypeScript

Preferred Technologies:

- React Three Fiber
- Three.js
- GSAP
- Framer Motion
- Lenis
- Motion Path Animations
- WebGL
- GLSL Shaders
- Custom Post Processing

Avoid unnecessary dependencies.

Favor custom implementations over generic libraries when they improve uniqueness.

---

# Content Standards

Never generate generic agency copy.

Avoid phrases such as:

- We build digital solutions
- We transform businesses
- We create innovative experiences
- Your trusted partner

Every headline should feel distinctive and memorable.

Every sentence should reinforce the Orbix universe.

---

# Performance Requirements

Awwwards-level visuals must not sacrifice performance.

Priorities:

1. Smooth 60fps interactions
2. Fast initial load
3. Progressive enhancement
4. Optimized assets
5. Efficient WebGL rendering

Visual ambition must coexist with engineering excellence.

---

# Decision Rule

Before proposing any feature, section, interaction, animation, or visual concept:

Ask:

1. Is this unique?
2. Is this memorable?
3. Is this technically impressive?
4. Does it strengthen the Orbix identity?
5. Could this appear on Awwwards?

If not:

Do not proceed.

Create something better.

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
  --bg: #060606; /* page background — near-black */
  --fg: #ebe8e0; /* foreground text — warm off-white */
  --muted: rgba(235, 232, 224, 0.38); /* secondary / metadata text */
  --accent: #00e5ff; /* signature electric cyan — CTAs, highlights, selection */
  --border: rgba(235, 232, 224, 0.08); /* hairline dividers, card borders */
  --card: #0d0d0d; /* elevated surfaces / cards */
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

| Key        | Component           | Idea                                     |
| ---------- | ------------------- | ---------------------------------------- |
| `orbital`  | `OrbitalTypeLoader` | orbiting type forms into the wordmark    |
| `kinetic`  | `KineticLoader`     | kinetic typography (current **default**) |
| `counter`  | `CounterLoader`     | percentage / counter count-up            |
| `words`    | `WordRevealLoader`  | sequential word reveal                   |
| `curtain`  | `CurtainLoader`     | panel/curtain wipe reveal                |
| `stroke`   | `StrokeLoader`      | SVG stroke-draw                          |
| `scramble` | `ScrambleLoader`    | text-scramble settle                     |

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

**Never use abbreviations.** Names must describe exactly what the value is. This applies to every variable, parameter, destructured value, and callback argument without exception.

```ts
// ❌ Wrong
const p = req.params;
const u = await getUser(id);
const fn = (e: Event) => {};
const d = new Date();
const ref = useRef<HTMLDivElement>(null); // only if "ref" is vague — prefer descriptive names
const { s, t } = useScroll();

// ✅ Correct
const routeParams = req.params;
const currentUser = await getUserById(userId);
const handleSubmit = (event: Event) => {};
const createdAt = new Date();
const heroContainerRef = useRef<HTMLDivElement>(null);
const { scrollProgress, scrollTarget } = useScroll();
```

When a parameter is a bag of options or data, name it after what it contains — not a generic shorthand:

```ts
// ❌
function animateParticles(p: ParticleConfig) {}
function buildScene(opts: SceneOptions) {}

// ✅
function animateParticles(particleConfig: ParticleConfig) {}
function buildScene(sceneOptions: SceneOptions) {}
```

### Files

- **`.tsx` files → PascalCase**, named after what they render: `Hero.tsx`, `WorkGrid.tsx`, `MagneticButton.tsx`, `OrbitalTypeLoader.tsx`. A `.tsx` file that exports a component is named after that component (e.g. a file exporting `SplitChars` is `SplitChars.tsx`).
- **`.ts` files** keep their idiomatic casing:
  - **hooks** → `camelCase`, verb-first: `useGsap.ts`, `useLenis.ts`, `useScrollVelocity.ts`.
  - **utilities / config / data** → `camelCase`, describing what the file does or contains: `formatDate.ts`, `parseFormValues.ts`, `calculateOrbitalPosition.ts` — never `utils.ts` / `helpers.ts` / `misc.ts`.
- File names must describe what the file **does or contains**. If the name alone doesn't tell you what's inside, rename it.

### Hooks

Verb-first, action-describing names:

```ts
useGsap();          // scoped GSAP runner + prefers-reduced-motion gate
useLenis();         // Lenis smooth-scroll lifecycle, synced to the GSAP ticker
useScrollVelocity() // derives scroll velocity for motion effects
useCursorPosition() // tracks cursor position for magnetic / parallax effects
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

Comments explain **why** something is done or walk through **steps in complex logic**. They should read like a human wrote them — not like generated documentation or a narration of obvious code.

```ts
// ❌ Obvious — says what the code already says
// Brighten the particle
brightness *= 1.5;

// ❌ Robotic — generated doc style
// This function calculates the orbital position based on angle and radius
function getOrbitalPosition(angle: number, radius: number) {}

// ✅ Explains the why
// Particles brighten as they lock in so the formed shape "pops" — this is what
// makes the reveal read as building, not just arriving
brightness *= 1.0 + gatherRaw * FORM_BRIGHTNESS_BOOST;

// ✅ Human and contextual
// We delay the hero reveal by one frame so the loader exit finishes painting
// before GSAP tries to measure element positions — measuring mid-transition
// gives wrong values and breaks the stagger
requestAnimationFrame(() => timeline.play());
```

For multi-step complex functions (especially animation timelines and shaders), number the steps:

```ts
// 1. Intro — elements fade in / settle (anticipation)
// 2. Build — staggered reveal ramps in
// 3. Resolve — final polish, then hand off / reveal the site
```

No JSDoc on every function. Only add JSDoc where a utility is genuinely reusable and non-obvious (e.g. a shared `lib/` helper used across multiple components).

---

## TypeScript

- Prefer `interface` for object shapes, `type` for unions and computed types.
- No `any`. Use `unknown` and narrow it.
- Type shared contracts explicitly and export them (e.g. `LoaderProps` in `components/loaders/types.ts`); derive registry key unions from them (`LoaderKey`).
- Generic hooks should be parameterised over the element type where it helps callers (e.g. `useGsap<HTMLElement>()`).

---

## Single Responsibility

Every file has **one job**. If a file is doing two different things, it needs to be split.

- A component renders UI — it delegates animation logic to hooks, not inline in JSX
- A hook manages one concern — scroll, cursor, GSAP lifecycle, etc.
- A shader file contains shader code — not scene setup, not React bindings
- A config/constants file holds static values — not logic, not side effects

**Line count is a signal, not a rule.** A 300-line shader that does one thing well is fine. A 100-line component doing both animation orchestration and layout is not. When a file starts owning two clearly different concerns, split it.

Example — animation hook that also handles DOM measurement is doing two jobs:

```ts
// ❌ One file doing two things
function useHeroAnimation(containerRef) {
  // measures DOM — one concern
  const bounds = containerRef.current.getBoundingClientRect();

  // runs animation — different concern
  gsap.from(containerRef.current, { opacity: 0, y: 40 });
}

// ✅ Separated
function useElementBounds(ref) { ... }   // measures DOM
function useHeroAnimation(ref) {         // runs animation, calls useElementBounds internally
  const bounds = useElementBounds(ref);
  ...
}
```

---

## General Rules

- No magic numbers. Named constants only — declare them at the top of the file, never inline.
- No commented-out code left in commits.
- Import order: external packages → internal aliases (`@/`) → relative imports.
- `'use client'` only where strictly necessary. Prefer Server Components for static markup; Client Components for animation-heavy or interactive sections.
- Three.js / WebGL imports are **dynamic** (`next/dynamic` with `ssr: false`) when they'd otherwise enter the server graph — they can't run on the server.
- Keep prototype code (`components/prototype/`, `/prototype`) isolated from the live homepage bundle.