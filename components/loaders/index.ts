import type { ComponentType } from "react";
import type { LoaderProps } from "./types";
import OrbitalTypeLoader from "./OrbitalTypeLoader";
import KineticLoader from "./KineticLoader";
import CounterLoader from "./CounterLoader";
import WordRevealLoader from "./WordRevealLoader";
import CurtainLoader from "./CurtainLoader";
import StrokeLoader from "./StrokeLoader";
import ScrambleLoader from "./ScrambleLoader";

export type LoaderKey =
  | "orbital"
  | "kinetic"
  | "counter"
  | "words"
  | "curtain"
  | "stroke"
  | "scramble";

export const LOADERS: Record<LoaderKey, ComponentType<LoaderProps>> = {
  orbital: OrbitalTypeLoader,
  kinetic: KineticLoader,
  counter: CounterLoader,
  words: WordRevealLoader,
  curtain: CurtainLoader,
  stroke: StrokeLoader,
  scramble: ScrambleLoader,
};

/** Stable order, also used to resolve numeric `?loader=1..7` overrides. */
export const LOADER_ORDER: LoaderKey[] = [
  "orbital",
  "kinetic",
  "counter",
  "words",
  "curtain",
  "stroke",
  "scramble",
];

/** The loader shown when no `?loader=` override is present. */
export const DEFAULT_LOADER: LoaderKey = "kinetic";

export type { LoaderProps };
