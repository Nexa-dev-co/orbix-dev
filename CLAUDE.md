# CLAUDE.md — Nexa Dev Studio

This file defines how code should be written, structured, and named in this codebase. Follow these rules in every suggestion, generation, and edit. This is a **pure frontend** Next.js project — no backend, no API routes, no database.

---

## Stack

**Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS

**UI & Components:** shadcn/ui (for base primitives only — modifed heavily to match Nexa design tokens)

**Animation:**
- `GSAP` + `ScrollTrigger` — scroll-driven reveals, text scramble effects, timeline sequencing
- `Framer Motion` — component-level transitions, page transitions, layout animations
- `lottie-web` — loading screen Lottie vector animation
- `Three.js` — WebGL background canvas and iris reveal shader
- `Lenis` — smooth inertial scrolling (replaces native scroll)

**Forms:** React Hook Form + Zod (contact page only)

**Font Loading:** `next/font` with `display: swap`

---

## Design System — Nexa Tokens

These are the canonical design tokens. Use them everywhere via CSS variables. **Never hardcode a color.**

### Color Palette

```css
:root {
  /* Backgrounds */
  --color-bg:           #080808;   /* near-black, warmer than pure black */
  --color-surface:      #0f0f0f;   /* cards, overlays */
  --color-surface-mid:  #161616;   /* elevated surfaces */

  /* Text */
  --color-text:         #e8e8e0;   /* off-white, warm tint */
  --color-text-muted:   #6b6b6b;   /* secondary/metadata text */
  --color-text-faint:   #2e2e2e;   /* dividers, ghost text */

  /* Accent — electric cyan (Nexa's signature) */
  --color-accent:       #00e5ff;   /* primary CTA, highlights */
  --color-accent-dim:   #00b8cc;   /* hover state of accent */
  --color-accent-glow:  rgba(0, 229, 255, 0.15); /* glow halos */

  /* Borders */
  --color-border:       rgba(255, 255, 255, 0.07);
  --color-border-hover: rgba(255, 255, 255, 0.15);

  /* Loading screen specific */
  --color-loading-bg:   #000000;
  --color-logo-stroke:  #c8c8c8;
}
```

### Typography

```css
/* Fonts loaded via next/font */

/* Display / Headings — sharp, geometric */
--font-display: 'Syne', sans-serif;

/* Body — clean, readable */
--font-body: 'DM Sans', sans-serif;

/* Mono — code, labels, loading text */
--font-mono: 'JetBrains Mono', monospace;
```

**Usage rules:**
- `--font-display` → all `h1`–`h3`, hero text, section titles
- `--font-body` → paragraphs, nav links, button labels
- `--font-mono` → loading tagline, code blocks, small metadata labels, badge text

### Spacing & Motion Tokens

```css
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-expo:  cubic-bezier(0.7, 0, 0.84, 0);
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);

  --duration-fast:   200ms;
  --duration-base:   400ms;
  --duration-slow:   800ms;
  --duration-cinematic: 1400ms;
}
```

---

## Loading Animation — Full Specification

This is a first-class feature of the site. Follow the implementation below exactly.

### Visual Sequence

| Phase | What Happens | Timing |
|---|---|---|
| 1 | Black screen appears, Lottie fades in | 0ms → 200ms |
| 2 | Nexa "N" SVG logo stroked outline fades in on top | 600ms |
| 3 | Tagline fades in at bottom | 1200ms |
| 4 | Once page hydrated → iris WebGL reveal begins | on `load` + 2500ms min |
| 5 | Overlay dismissed, main content transitions in | after reveal |

### Nexa-Specific Tweaks vs alche.studio

- **No Lottie at first** — The loading screen opens with just the black background and a subtle **animated noise/grain texture** (CSS or a tiny canvas shader) for the first 200ms before Lottie appears. Feels more intentional.
- **Logo stroke color:** `#c8c8c8` (slightly cooler than alche's `#bbb`)
- **Tagline text:** *"We build digital products that perform."* — `JetBrains Mono`, `0.65vmax`, `font-weight: 300`
- **Iris reveal tint:** As the iris expands, a faint **cyan glow pulse** (`rgba(0, 229, 255, 0.08)`) emanates from the center before the scene fully reveals — achieved by a secondary uniform `uAccentPulse` in the shader
- **Edge mask gradient:** Slightly tighter: `transparent 0%, black 8%, black 92%, transparent 100%`
- **Minimum display time:** 2800ms (longer than alche's 2500ms — the animation deserves full attention)

### HTML Structure (as a Next.js component)

```tsx
// components/loading/LoadingOverlay.tsx
// This is a Client Component rendered in the root layout, above everything else.
```

### Component File

```
components/
  loading/
    LoadingOverlay.tsx     # full overlay — Lottie, logo, tagline, canvas for iris
    LoadingOverlay.css     # scoped styles (not Tailwind — pixel-specific positioning)
    iris-shader.ts         # GLSL strings + Three.js iris reveal logic
    grain-overlay.ts       # subtle animated noise canvas utility
```

### CSS (LoadingOverlay.css)

```css
.loading-container {
  position: fixed;
  inset: 0;
  height: 100lvh;
  z-index: 9999;
  background-color: var(--color-loading-bg);
  pointer-events: auto;
}

.loading-container[data-hidden] {
  pointer-events: none;
}

.loading-lottie-container {
  position: absolute;
  inset: 0;
  width: 80%;
  left: 50%;
  transform: translateX(-50%);
  mask: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
  -webkit-mask: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
}

.loading-lottie {
  opacity: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: opacity 0.8s ease;
}

.loading-logo {
  opacity: 0;
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 1s ease;
}

.loading-logo svg path {
  stroke: var(--color-logo-stroke);
  fill: none;
}

.loading-text {
  opacity: 0;
  position: absolute;
  bottom: max(10px, 50% - 14vmax);
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-text);
  font-size: 0.65vmax;
  font-weight: 300;
  line-height: 1.4;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
  z-index: 11;
  font-family: var(--font-mono);
  transition: opacity 0.5s;
  letter-spacing: 0.08em;
}

/* Iris reveal canvas — sits on top of overlay, driven by Three.js */
.loading-iris-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
}

/* Grain overlay */
.loading-grain {
  position: absolute;
  inset: 0;
  z-index: 5;
  opacity: 0.04;
  pointer-events: none;
}
```

### Iris Reveal Shader (GLSL)

```glsl
// iris-shader.ts — finalCompositeFrag
// uLoaded: 0.0 → 1.0 (driven by JS animation)
// uAccentPulse: 0.0 → 1.0 (peaks at ~uLoaded 0.3, then fades)

uniform float uLoaded;
uniform float uAccentPulse;
uniform sampler2D uScene;
uniform vec2 uResolution;
varying vec2 vUv;

#define PI 3.14159265358979

void main() {
  vec2 uv = vUv;
  vec2 cuv = uv - 0.5;
  cuv.x *= uResolution.x / uResolution.y; // correct aspect

  float dist = length(cuv);

  // Radial iris mask — expands as uLoaded increases
  float r = smoothstep(0.0, 0.2 + uLoaded * 0.7, -dist + uLoaded * 1.4);

  // Zoom: scene starts at 55% zoom, ends at 100%
  vec2 sceneUv = uv - 0.5;
  sceneUv *= (0.45 + uLoaded * 0.55);
  sceneUv += 0.5;

  // Barrel distortion during reveal
  sceneUv -= sin(r * PI) * normalize(cuv) * 0.08;

  vec4 sceneColor = texture2D(uScene, sceneUv);

  // Cyan accent pulse from center — Nexa addition
  float pulse = uAccentPulse * (1.0 - dist * 2.0);
  pulse = max(0.0, pulse);
  vec3 accentColor = vec3(0.0, 0.898, 1.0); // #00e5ff
  sceneColor.rgb += accentColor * pulse * 0.12;

  gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), sceneColor, r);
}
```

### Animation Sequence (TypeScript)

```ts
// Inside LoadingOverlay.tsx — useEffect on mount

// Phase 1 — Grain already visible (CSS), Lottie fades in
setTimeout(() => { lottieEl.style.opacity = '1'; }, 200);

// Phase 2 — Logo stroked SVG fades in
setTimeout(() => { logoEl.style.opacity = '1'; }, 600);

// Phase 3 — Tagline fades in
setTimeout(() => { textEl.style.opacity = '1'; }, 1200);

// Phase 4 — On window load + minimum 2800ms, iris reveal begins
// uLoaded animated from 0 → 1 over 1600ms via GSAP
// uAccentPulse peaks at 0.3 then falls — GSAP timeline

// Phase 5 — overlay[data-hidden] set, body[data-loaded=true] triggers
// header, nav, and hero entrance via CSS transitions
```

---

## Project Structure

```
app/
  layout.tsx             # root layout — fonts, LoadingOverlay, Lenis init, global CSS
  page.tsx               # homepage shell → <HomeView />
  about/
    page.tsx             # → <AboutView />
  services/
    page.tsx             # → <ServicesView />
  contact/
    page.tsx             # → <ContactView />

components/
  loading/
    LoadingOverlay.tsx
    LoadingOverlay.css
    iris-shader.ts
    grain-overlay.ts
  layout/
    Header.tsx           # nav — hidden until data-loaded=true on body
    Footer.tsx
    SmoothScroller.tsx   # Lenis wrapper (Client Component)
  home/
    HomeView.tsx
    HeroSection.tsx      # Three.js canvas background + headline
    ServicesPreview.tsx
    StatsBar.tsx
    CtaSection.tsx
  about/
    AboutView.tsx
    TeamSection.tsx
    ValuesSection.tsx
    TimelineSection.tsx
  services/
    ServicesView.tsx
    ServiceCard.tsx
    ServicesList.tsx
  contact/
    ContactView.tsx
    ContactForm.tsx      # React Hook Form + Zod
  ui/                    # shadcn/ui primitives (heavily restyled)
    button.tsx
    input.tsx
    textarea.tsx

lib/
  three-setup.ts         # Three.js renderer, scene, camera bootstrap
  lenis.ts               # Lenis singleton
  gsap-config.ts         # GSAP + ScrollTrigger registration

hooks/
  useIriReveal.ts        # WebGL iris reveal lifecycle
  useScrollReveal.ts     # GSAP ScrollTrigger text/element reveals
  useTextScramble.ts     # GSAP text scramble effect

types/
  contact.ts             # ContactFormValues, Zod inferred types

public/
  loading/
    data.json            # Lottie animation file
  fonts/                 # self-hosted fallbacks if next/font fails
```

---

## Page-by-Page Notes

### Landing Page (`/`)
- Full-viewport hero with **Three.js WebGL background** — abstract particle mesh or flowing geometry in Nexa cyan on dark
- Headline uses `--font-display`, large, with GSAP text scramble on load
- Scroll-triggered section reveals via `useScrollReveal`
- Services preview grid, stats bar, CTA

### Services (`/services`)
- Full list of services in a bento-style grid
- Each `ServiceCard` has a hover effect — border lights up in `--color-accent`, subtle glow halo
- No modals — each card is self-contained

### About (`/about`)
- Team section, company values, founding timeline
- Timeline uses GSAP ScrollTrigger for line-draw animation

### Contact (`/contact`)
- Simple form: Name, Email, Company, Message
- React Hook Form + Zod validation
- No backend — `mailto:` fallback or Formspree endpoint
- Form fields styled with `--color-border` + focus glow in `--color-accent`

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

File names must describe what the file **does or contains**.

```
// ❌
utils.ts / helpers.ts / misc.ts

// ✅
format-date.ts / parse-form-values.ts / calculate-read-time.ts
```

### Hooks

Verb-first, action-describing names:

```ts
useIrisReveal()      // WebGL iris animation lifecycle
useScrollReveal()    // GSAP scroll-triggered reveals
useTextScramble()    // text scramble effect
useContactForm()     // form state + submission
```

### Components

PascalCase, named after what they render:

```
HeroSection.tsx / ServiceCard.tsx / ContactForm.tsx / LoadingOverlay.tsx
```

---

## Exports

- **Pages & components** → `default export`
- **Utils, hooks, lib, types** → `named export`
- **Next.js `page.tsx` and `layout.tsx`** → always `default export` (required)

---

## Animation Philosophy

Every animation must feel **purposeful and cinematic**, not decorative.

Rules:
1. **The loading sequence is sacred.** Never skip it or simplify it during development. Use a `?skip_loading=1` query param to bypass if needed, not code changes.
2. **Scroll reveals use GSAP ScrollTrigger**, not Intersection Observer manually — keeps animation logic centralized.
3. **Framer Motion** is for component-level transitions (route changes, card hovers, modal entrances). Don't mix with GSAP for the same element.
4. **Lenis** wraps the entire scroll. Always use `lenis.on('scroll', ScrollTrigger.update)` to keep them in sync.
5. **Three.js canvas** renders behind everything at `z-index: 0`. Never block scroll or pointer events.
6. Animations respect `prefers-reduced-motion` — wrap all non-essential motion in a check:

```ts
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  // run GSAP / Three.js / Lottie animations
}
```

---

## Comments

Comments explain **why**, not what.

```ts
// ❌ Obvious
// Fade in the logo
logoEl.style.opacity = '1';

// ✅ Explains why this timing
// Logo fades in at 600ms, not immediately — we let the Lottie establish
// visual context first so the logo reveal feels like a discovery, not a splash screen
logoEl.style.opacity = '1';
```

For multi-step complex functions (especially animation sequences), number the steps:

```ts
// 1. Wait for Lottie to establish before revealing logo
// 2. Tagline comes last — it's the emotional beat, needs breathing room
// 3. Iris reveal only fires after real assets loaded AND min display time met
//    — avoids a flash if the user's machine is fast
```

---

## TypeScript

- Prefer `interface` for object shapes, `type` for unions and computed types
- No `any`. Use `unknown` and narrow it.
- Zod schemas are source of truth — infer TS types from them:

```ts
export const contactFormSchema = z.object({
  fullName:    z.string().min(2),
  email:       z.string().email(),
  companyName: z.string().optional(),
  message:     z.string().min(10),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
```

---

## General Rules

- No magic numbers. Named constants only.
- No commented-out code left in commits.
- Env variables (e.g. Formspree endpoint) accessed through a typed `env.ts` wrapper, never `process.env.X` inline.
- Import order: external packages → internal aliases (`@/`) → relative imports.
- `'use client'` only where strictly necessary. Prefer Server Components for static sections; Client Components for animation-heavy or interactive sections.
- Three.js and Lottie imports are **dynamic** (`next/dynamic` with `ssr: false`) — they cannot run on the server.
