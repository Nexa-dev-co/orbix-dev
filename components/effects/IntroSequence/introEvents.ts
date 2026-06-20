/**
 * Fired by the IntroSequence orchestrator at the exact moment the blue sun lands
 * in the hero square slot. The hero listens for it and runs its reveal (text
 * mask-wipe + square "water fill" + sun crossfade). Shared so both sides agree
 * on the handoff name.
 */
export const REVEAL_EVENT = 'orbix:reveal';
