import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
  Central GSAP + ScrollTrigger registration. Plugins must register exactly once
  and only in the browser. Import { gsap, ScrollTrigger } from here everywhere
  so registration is guaranteed before use and animation logic stays centralized
  (Animation Philosophy: scroll reveals use ScrollTrigger, not manual observers).
*/
let isRegistered = false;

export function registerGsap(): void {
  if (isRegistered || typeof window === "undefined") {
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  isRegistered = true;
}

export { gsap, ScrollTrigger };
