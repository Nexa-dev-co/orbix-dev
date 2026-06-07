import type { LoadingVariantDefinition } from "../loading-variant";
import ConstellationLoading from "./ConstellationLoading";
import FlowFieldLoading from "./FlowFieldLoading";
import GlitchLoading from "./GlitchLoading";
import WarpTunnelLoading from "./WarpTunnelLoading";
import DissolveLoading from "./DissolveLoading";

/*
  Every selectable loading variant. The lab renders one button per entry; add a
  new variant by appending here (no other wiring needed).
*/
export const LOADING_VARIANTS: LoadingVariantDefinition[] = [
  {
    id: "constellation",
    label: "Constellation → NEXA",
    description:
      "Scattered 3D nodes connect with lines and converge into the NEXA wordmark as the camera zooms out, then burst away to reveal the page.",
    Component: ConstellationLoading,
  },
  {
    id: "flow-field",
    label: "Flow Field → NEXA",
    description:
      "A domain-warped cyan energy field organizes into the glowing NEXA letterforms, then dissolves along its own flow to reveal the page.",
    Component: FlowFieldLoading,
  },
  {
    id: "glitch",
    label: "Signal Glitch → NEXA",
    description:
      "The wordmark materializes out of band-tearing RGB-split glitch and scanlines, settles crisp, then glitch-wipes to reveal the page.",
    Component: GlitchLoading,
  },
  {
    id: "warp-tunnel",
    label: "Warp Tunnel → NEXA",
    description:
      "Fly through a tunnel of glowing cyan rings, decelerate as NEXA resolves at the end, then punch through it to the page.",
    Component: WarpTunnelLoading,
  },
  {
    id: "dissolve",
    label: "Noise Dissolve",
    description:
      "Black overlay erodes along a moving noise edge with a cyan glow front.",
    Component: DissolveLoading,
  },
];
