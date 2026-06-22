// The four vessels that sit on the Services deck. Each ship is dormant until the
// visitor hovers (lights ignite) or clicks (it powers up and steps forward).
//
// The rich eyebrow / description / capability copy is carried over verbatim from the
// /services page (components/sections/ServicesFleet/servicesData.ts) so the two
// surfaces stay in one voice; only the short display `name` differs here.

// Model → service assignment. Each ship is one line — swap a path to reassign a
// vessel. episode_77_-_spaceship.glb is held spare (five models, four bays).
const WEB_VESSEL        = '/models/spaceship.glb';
const MOBILE_VESSEL     = '/models/helicopter_space_ship.glb';
const ENTERPRISE_VESSEL = '/models/spaceship2.glb';
const AI_VESSEL         = '/models/ship_lkj.glb';

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
  },
  {
    index: '02',
    name: 'Mobile Systems',
    eyebrow: 'Native, in every dimension',
    description:
      'Apps that feel like an extension of the device, not a website in a frame. Sixty frames a second, offline-first, and tactile in the hand.',
    capabilities: ['iOS / Android', 'Offline-first', 'Motion', 'Haptics'],
    modelPath: MOBILE_VESSEL,
  },
  {
    index: '03',
    name: 'Enterprise Platforms',
    eyebrow: 'Gravity for your pipeline',
    description:
      'Operational cores that pull every signal into one orbit. We model the way your business actually works, then make the software disappear into the workflow.',
    capabilities: ['Workflow Engines', 'Integrations', 'Roles & Access', 'Reporting'],
    modelPath: ENTERPRISE_VESSEL,
  },
  {
    index: '04',
    name: 'Artificial Intelligence',
    eyebrow: 'Intelligence in orbit',
    description:
      'Models wired into real products, not demos. Retrieval, agents, and inference pipelines designed around your data — useful on day one, smarter every week.',
    capabilities: ['LLM Pipelines', 'RAG', 'Agents', 'Evaluation'],
    modelPath: AI_VESSEL,
  },
];
