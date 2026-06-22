export interface FleetService {
  /** Two-digit ordinal shown in the index, e.g. "01". */
  index: string;
  name: string;
  /** Short poetic kicker shown above the name while the service is active. */
  eyebrow: string;
  description: string;
  /** Capability tags surfaced under the active description. */
  capabilities: string[];
  /**
   * Path to this service's 3D vessel (a .glb under /public/models).
   * Each service gets its own model — swap this one line as each model lands.
   */
  modelPath: string;
}

// Until a dedicated vessel is delivered for a service, it flies the shared
// spaceship so the page is fully alive today. Replace per-service below.
const PLACEHOLDER_VESSEL = "/models/spaceship.glb";

export const FLEET_SERVICES: FleetService[] = [
  {
    index: "01",
    name: "Custom Web Applications",
    eyebrow: "Interfaces with escape velocity",
    description:
      "Bespoke platforms engineered from the metal up — no templates, no compromise. Every interaction is hand-tuned until the product moves like it has its own momentum.",
    capabilities: ["Next.js", "WebGL / GLSL", "Realtime", "Design Systems"],
    modelPath: PLACEHOLDER_VESSEL, // → /models/web-app.glb
  },
  {
    index: "02",
    name: "SaaS Platforms",
    eyebrow: "Products that compound",
    description:
      "Multi-tenant systems built to scale without strain — billing, auth, and data planes that stay quiet at one user and at one million. Architecture you never have to rebuild.",
    capabilities: ["Multi-tenancy", "Billing", "Observability", "Edge"],
    modelPath: "/models/episode_77_-_spaceship.glb", // → /models/saas.glb
  },
  {
    index: "03",
    name: "Enterprise CRM Systems",
    eyebrow: "Gravity for your pipeline",
    description:
      "Operational cores that pull every signal into one orbit. We model the way your business actually works, then make the software disappear into the workflow.",
    capabilities: [
      "Workflow Engines",
      "Integrations",
      "Roles & Access",
      "Reporting",
    ],
    modelPath: "/models/helicopter_space_ship.glb", // → /models/crm.glb
  },
  {
    index: "04",
    name: "Mobile Applications",
    eyebrow: "Native, in every dimension",
    description:
      "Apps that feel like an extension of the device, not a website in a frame. Sixty frames a second, offline-first, and tactile in the hand.",
    capabilities: ["iOS / Android", "Offline-first", "Motion", "Haptics"],
    modelPath: "/models/star_aventure_spaceship_starship_fighter.glb", // → /models/mobile.glb
  },
  {
    index: "05",
    name: "AI Solutions",
    eyebrow: "Intelligence in orbit",
    description:
      "Models wired into real products, not demos. Retrieval, agents, and inference pipelines designed around your data — useful on day one, smarter every week.",
    capabilities: ["LLM Pipelines", "RAG", "Agents", "Evaluation"],
    modelPath: "/models/ship_lkj.glb", // → /models/ai.glb
  },
  {
    index: "06",
    name: "Digital Product Design",
    eyebrow: "Form that obeys physics",
    description:
      "Direction, identity, and motion language for products that want to be remembered. We design the feeling first, then engineer it into pixels that hold their shape.",
    capabilities: ["Art Direction", "Prototyping", "Motion", "Brand Systems"],
    modelPath: "/models/starship3.glb", // → /models/design.glb
  },
];
