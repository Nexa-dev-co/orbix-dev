"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// the "universe" coordinate space the camera pans/zooms across
const UNI = { w: 3200, h: 2200, cx: 1600, cy: 1100 };
const ZIN = 1.9; // zoomed in on a section
const ZMID = 1.15; // "fly" mode: only ease back a little while travelling
const T = 1; // transition length (timeline units)
const H = 0.5; // rest/hold length

type Node = { nav: string; kicker: string; title: React.ReactNode; copy: string; cta?: boolean };

const NODES: Node[] = [
  { nav: "About", kicker: "Orbit 01 — About", title: "We build worlds", copy: "A small, fiercely focused studio crafting cinematic, story-driven web experiences." },
  { nav: "Work", kicker: "Orbit 02 — Work", title: "Selected transmissions", copy: "Signals from recent missions — SaaS, commerce, campaigns and mobile-first apps." },
  { nav: "Process", kicker: "Orbit 03 — Process", title: "How we navigate", copy: "Plot · Build · Launch. A tight loop from first sketch to live orbit." },
  { nav: "Services", kicker: "Orbit 04 — Services", title: "What we do", copy: "Design, build and motion for brands that want to feel alive." },
  { nav: "Contact", kicker: "Orbit 05 — Landing", title: "Make contact", copy: "You’ve reached the core. Enter orbit with us.", cta: true },
];

// each section's location + its orbit radius (node sits on its own ring)
const POINTS = NODES.map((_, i) => {
  const r = 300 + i * 200;
  const a = -Math.PI / 2 + i * 2.3;
  return { x: UNI.cx + Math.cos(a) * r, y: UNI.cy + Math.sin(a) * r, r };
});

export default function OrbitMap() {
  const wrap = useRef<HTMLDivElement>(null);
  const universe = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // "fly" (default): ease back a little + travel; "zoom": full zoom-out overview (?cam=zoom)
  const [mode, setMode] = useState<"fly" | "zoom">("fly");
  const stRef = useRef<ScrollTrigger | null>(null);
  const restRef = useRef<number[]>([]);

  const jumpTo = (i: number) => {
    const st = stRef.current;
    const rest = restRef.current[i];
    if (!st || rest == null) return;
    window.scrollTo({ top: st.start + rest * (st.end - st.start), behavior: "smooth" });
  };

  useEffect(() => {
    const wrapEl = wrap.current;
    const uniEl = universe.current;
    if (!wrapEl || !uniEl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const camMode =
      new URLSearchParams(window.location.search).get("cam") === "zoom" ? "zoom" : "fly";
    setMode(camMode);

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const zoomOut = () => Math.min(vw / UNI.w, vh / UNI.h) * 0.9;

    // camera: focus point in universe space + scale
    const cam = { fx: POINTS[0].x, fy: POINTS[0].y, scale: ZIN };
    gsap.set(uniEl, { transformOrigin: "0 0" });
    const applyCam = () => {
      const s = cam.scale;
      gsap.set(uniEl, { x: vw / 2 - cam.fx * s, y: vh / 2 - cam.fy * s, scale: s });
    };
    applyCam();

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(".om-panel");
      const N = NODES.length;
      // how far the camera pulls back during a transition
      const dip = camMode === "zoom" ? zoomOut() : ZMID;

      gsap.set(panels, { autoAlpha: 0, scale: 1.06 });
      gsap.set(panels[0], { autoAlpha: 1, scale: 1 });

      const tl = gsap.timeline({ onUpdate: applyCam });
      const restCenters: number[] = [H / 2];
      tl.to({}, { duration: H });

      for (let i = 1; i < N; i++) {
        const at = H + (i - 1) * (T + H);
        // ease back → travel across the map → zoom into the next orbit
        tl.to(cam, { scale: dip, duration: 0.45, ease: "power2.in" }, at);
        tl.to(cam, { fx: POINTS[i].x, fy: POINTS[i].y, duration: 0.9, ease: "power2.inOut" }, at + 0.1);
        tl.to(cam, { scale: ZIN, duration: 0.45, ease: "power2.out" }, at + 0.55);
        // content: old fades as we pull out, new fades in as we arrive
        tl.to(panels[i - 1], { autoAlpha: 0, scale: 0.96, duration: 0.35, ease: "power2.in" }, at);
        tl.fromTo(
          panels[i],
          { autoAlpha: 0, scale: 1.06 },
          { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power2.out" },
          at + 0.7
        );
        tl.to({}, { duration: H });
        restCenters.push(at + T + H / 2);
      }

      const total = tl.duration();
      const restPoints = restCenters.map((t) => t / total);
      restRef.current = restPoints;
      const steps = restPoints.length - 1;

      stRef.current = ScrollTrigger.create({
        trigger: wrapEl,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        animation: tl,
        snap: { snapTo: restPoints, duration: { min: 0.2, max: 0.6 }, ease: "power1.inOut", delay: 0.05 },
        onUpdate: (self) => {
          const idx = Math.round(self.progress * steps);
          setActive((cur) => (cur === idx ? cur : idx));
        },
      });

      ScrollTrigger.refresh();
    }, wrap);

    const onResize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      applyCam();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrap} style={{ position: "relative", height: `${NODES.length * 120}vh`, background: "var(--bg)" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", color: "var(--fg)" }}>
        {/* ── the map / universe (camera pans + zooms across this) ── */}
        <div ref={universe} style={{ position: "absolute", top: 0, left: 0, width: UNI.w, height: UNI.h }}>
          <svg width={UNI.w} height={UNI.h} style={{ position: "absolute", inset: 0 }}>
            {/* stars */}
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--fg)" opacity={0.18} />
            ))}
            {/* orbit rings */}
            {POINTS.map((p, i) => (
              <circle key={i} cx={UNI.cx} cy={UNI.cy} r={p.r} fill="none" stroke="var(--border)" strokeWidth={1} />
            ))}
            {/* travel routes between consecutive nodes */}
            {POINTS.slice(1).map((p, i) => (
              <line
                key={i}
                x1={POINTS[i].x}
                y1={POINTS[i].y}
                x2={p.x}
                y2={p.y}
                stroke="var(--accent)"
                strokeWidth={1}
                strokeDasharray="2 8"
                opacity={0.25}
              />
            ))}
            {/* planet core */}
            <circle cx={UNI.cx} cy={UNI.cy} r={70} fill="var(--accent)" opacity={0.12} />
            <circle cx={UNI.cx} cy={UNI.cy} r={22} fill="var(--accent)" />
            {/* section nodes */}
            {POINTS.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={active === i ? 14 : 9} fill={active === i ? "var(--accent)" : "var(--muted)"} />
                <circle cx={p.x} cy={p.y} r={active === i ? 26 : 0} fill="none" stroke="var(--accent)" strokeWidth={1} opacity={0.5} />
              </g>
            ))}
          </svg>
        </div>

        {/* ── content panels (crisp overlay; crossfade on arrival) ── */}
        {NODES.map((n, i) => (
          <div
            key={i}
            className="om-panel"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 8vw",
              pointerEvents: i === active ? "auto" : "none",
            }}
          >
            <span className="eyebrow" style={{ color: "var(--accent)" }}>{n.kicker}</span>
            <h2
              className="font-display"
              style={{ fontWeight: 800, fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 1.02, margin: "0.6rem 0 1rem", letterSpacing: "-0.01em" }}
            >
              {n.title}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "1.05rem", maxWidth: 460 }}>{n.copy}</p>
            {n.cta && (
              <a
                href="mailto:hello@orbix.studio"
                style={{ display: "inline-block", marginTop: "1.6rem", padding: "0.9rem 2rem", border: "1px solid var(--accent)", borderRadius: 999, color: "var(--fg)", textDecoration: "none", letterSpacing: "0.04em" }}
              >
                Enter orbit →
              </a>
            )}
          </div>
        ))}

        {/* mode hint */}
        <div
          className="eyebrow"
          style={{ position: "fixed", left: "clamp(1.2rem,3vw,2.4rem)", bottom: "clamp(1.2rem,3vw,2.4rem)", zIndex: 100, color: "var(--muted)" }}
        >
          Camera: {mode === "zoom" ? "full zoom-out" : "fly along route"}
          {mode === "fly" ? " · ?cam=zoom for alt" : " · ?cam=fly for default"}
        </div>

        {/* nav rail */}
        <div style={{ position: "fixed", right: "clamp(1.2rem,3vw,2.4rem)", top: "50%", transform: "translateY(-50%)", zIndex: 100, display: "flex", flexDirection: "column", gap: "0.9rem", alignItems: "flex-end" }}>
          {NODES.map((n, i) => (
            <button key={i} onClick={() => jumpTo(i)} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "none", border: "none", cursor: "pointer", color: i === active ? "var(--fg)" : "var(--muted)", padding: 0 }}>
              <span className="eyebrow" style={{ opacity: i === active ? 1 : 0, transition: "opacity 0.3s" }}>{n.nav}</span>
              <span style={{ width: i === active ? 26 : 14, height: 2, background: i === active ? "var(--accent)" : "var(--border)", transition: "all 0.35s" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// deterministic star field across the universe
const STARS = Array.from({ length: 90 }, (_, i) => {
  const seed = (n: number) => {
    const x = Math.sin(i * 99.7 + n * 12.3) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: seed(1) * UNI.w, y: seed(2) * UNI.h, r: 1 + seed(3) * 1.6 };
});
