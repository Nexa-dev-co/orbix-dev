// The four vessels that sit on the Services deck. Each ship is dormant until the
// visitor hovers (lights ignite) or clicks (it powers up and steps forward).
//
// The rich eyebrow / description / capability copy is carried over verbatim from the
// /services page (components/sections/ServicesFleet/servicesData.ts) so the two
// surfaces stay in one voice; only the short display `name` differs here.

// Model → service assignment. Each ship is one line — swap a path to reassign a
// vessel. The carousel shows one craft at a time, so every bay gets a distinct hull.
const WEB_VESSEL        = '/models/spaceship.glb';
const MOBILE_VESSEL     = '/models/spaceship3.glb';
const ENTERPRISE_VESSEL = '/models/cargo_spaceship.glb';
const AI_VESSEL         = '/models/star_aventure_spaceship_starship_fighter.glb';

export interface DeckService {
  /** Two-digit ordinal shown beside the label, e.g. "01". */
  index: string;
  /** Short display name shown on the deck. */
  name: string;
  /** Poetic kicker revealed above the description when the service is active. */
  eyebrow: string;
  description: string;
  /** Capability tags surfaced under the active description. */
  capabilities: string[];
  /** Path to this service's vessel — a Draco-compressed .glb under /public/models. */
  modelPath: string;
  /** Hull mix — the colour where the hull faces the camera (CSS hex). Multiplies the texture. */
  colorCore: string;
  /** Hull mix — the colour at grazing/edge angles, blended with colorCore across the hull. */
  colorEdge: string;
}

export const DECK_SERVICES: DeckService[] = [
  {
    index: '01',
    name: 'Web Experiences',
    eyebrow: 'Interfaces with escape velocity',
    description:
      'Bespoke platforms engineered from the metal up — no templates, no compromise. Every interaction is hand-tuned until the product moves like it has its own momentum.',
    capabilities: ['Next.js', 'WebGL / GLSL', 'Realtime', 'Design Systems'],
    modelPath: WEB_VESSEL,
    colorCore: '#2f6ad0',
    colorEdge: '#22ecff',
  },
  {
    index: '02',
    name: 'Mobile Systems',
    eyebrow: 'Native, in every dimension',
    description:
      'Apps that feel like an extension of the device, not a website in a frame. Sixty frames a second, offline-first, and tactile in the hand.',
    capabilities: ['iOS / Android', 'Offline-first', 'Motion', 'Haptics'],
    modelPath: MOBILE_VESSEL,
    colorCore: '#1aa79c',
    colorEdge: '#6cf2d0',
  },
  {
    index: '03',
    name: 'Enterprise Platforms',
    eyebrow: 'Gravity for your pipeline',
    description:
      'Operational cores that pull every signal into one orbit. We model the way your business actually works, then make the software disappear into the workflow.',
    capabilities: ['Workflow Engines', 'Integrations', 'Roles & Access', 'Reporting'],
    modelPath: ENTERPRISE_VESSEL,
    colorCore: '#4a6a9a',
    colorEdge: '#9fe6ff',
  },
  {
    index: '04',
    name: 'Artificial Intelligence',
    eyebrow: 'Intelligence in orbit',
    description:
      'Models wired into real products, not demos. Retrieval, agents, and inference pipelines designed around your data — useful on day one, smarter every week.',
    capabilities: ['LLM Pipelines', 'RAG', 'Agents', 'Evaluation'],
    modelPath: AI_VESSEL,
    colorCore: '#7a4ad0',
    colorEdge: '#36e6ff',
  },
];
