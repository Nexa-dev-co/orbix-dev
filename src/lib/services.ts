export interface Service {
  title: string;
  summary: string;
  capabilities: string[];
}

// Single source of truth for services — used by the services page grid and the
// homepage preview, so the two never drift.
export const SERVICES: Service[] = [
  {
    title: "Web Engineering",
    summary:
      "Production-grade frontends in Next.js and TypeScript — fast, accessible, and built to scale.",
    capabilities: ["Next.js", "TypeScript", "Design systems"],
  },
  {
    title: "Product Design",
    summary:
      "Interface and interaction design that turns complex products into something people love to use.",
    capabilities: ["UX", "UI", "Prototyping"],
  },
  {
    title: "Motion & 3D",
    summary:
      "Cinematic motion, WebGL, and shader work that makes a product feel alive without slowing it down.",
    capabilities: ["GSAP", "Three.js", "Shaders"],
  },
  {
    title: "Brand & Identity",
    summary:
      "Visual systems — type, color, and voice — that give a digital product a memorable point of view.",
    capabilities: ["Identity", "Art direction", "Guidelines"],
  },
  {
    title: "Performance & SEO",
    summary:
      "Core Web Vitals, rendering strategy, and technical SEO so the work performs in every sense.",
    capabilities: ["Web Vitals", "SSR/SSG", "Audits"],
  },
  {
    title: "Strategy",
    summary:
      "Product and technical strategy that aligns what you build with the outcomes you need.",
    capabilities: ["Discovery", "Roadmapping", "Architecture"],
  },
];
