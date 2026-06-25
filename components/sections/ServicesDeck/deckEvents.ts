/**
 * Fired the moment the hero square has fully filled the screen and the fleet is
 * revealed (and on every re-reveal after scrolling back up). `useServicesDeck`
 * listens for it to replay the centred craft's entrance, so the animation runs
 * again each time the deck comes back into view. Shared here so the transition
 * (driven by the hero pin) and the scene agree on the handoff name.
 */
export const DECK_REVEAL_EVENT = 'deck:reveal';
