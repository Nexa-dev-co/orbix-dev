"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import WorkCardCanvas, { CanvasVariant } from "@/components/canvas/WorkCardCanvas";

gsap.registerPlugin(ScrollTrigger);

type Project = {
  id: number;
  tag: string;
  title: string;
  year: string;
  variant: CanvasVariant;
  bg: string;
};

const PROJECTS: Project[] = [
  {
    id: 1,
    tag: "SaaS Platform",
    title: "Orion Analytics Dashboard",
    year: "2024",
    variant: "orion",
    bg: "#0D0400",
  },
  {
    id: 2,
    tag: "E-commerce",
    title: "Volta Store",
    year: "2025",
    variant: "volta",
    bg: "#00060F",
  },
  {
    id: 3,
    tag: "Mobile PWA",
    title: "Flux App",
    year: "2025",
    variant: "flux",
    bg: "#050010",
  },
  {
    id: 4,
    tag: "Marketing Site",
    title: "Apex Campaign",
    year: "2024",
    variant: "apex",
    bg: "#001A0A",
  },
];

function WorkCard({
  project,
  index,
  stacked,
}: {
  project: Project;
  index: number;
  stacked: boolean;
}) {
  return (
    <a
      href="#"
      data-cursor="view"
      className="work-card group relative flex-shrink-0 overflow-hidden"
      style={{
        width: stacked ? "100%" : 480,
        height: stacked ? 420 : 560,
        borderRadius: 2,
        border: "0.5px solid var(--border)",
        background: project.bg,
      }}
    >
      {/* Inner visual — hover lifts (scale 1.02); a nested layer takes the
          scroll parallax so the two transforms don't fight. */}
      <div className="work-card-inner absolute inset-0 transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]">
        <div className="work-card-parallax absolute inset-0">
          {/* Generative "video loop" background; brightens on hover */}
          <WorkCardCanvas
            variant={project.variant}
            className="transition-[filter] duration-500 ease-out group-hover:[filter:brightness(1.3)_saturate(1.4)]"
          />
        </div>
      </div>

      {/* Large faint card number, top-right */}
      <span
        className="pointer-events-none absolute font-display font-extrabold leading-none"
        style={{
          top: 16,
          right: 24,
          fontSize: 120,
          opacity: 0.06,
          color: "var(--fg)",
        }}
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* tag pill, top-left */}
      <span
        className="absolute z-10 uppercase"
        style={{
          top: 24,
          left: 24,
          background: "rgba(255,61,31,0.1)",
          border: "0.5px solid rgba(255,61,31,0.25)",
          color: "rgba(255,100,60,0.9)",
          fontSize: 9,
          letterSpacing: "2px",
          padding: "4px 10px",
          borderRadius: 100,
        }}
      >
        {project.tag}
      </span>

      {/* red hover overlay */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[600ms] ease-out group-hover:opacity-100"
        style={{ background: "rgba(255,61,31,0.06)" }}
        aria-hidden
      />

      {/* Project info, bottom-left */}
      <div className="absolute bottom-7 left-7 z-10">
        <h3 className="font-display text-[22px] font-bold leading-tight text-fg">
          {project.title}
        </h3>
        <div className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>
          {project.year}
        </div>
      </div>
    </a>
  );
}

export default function WorkGrid() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);

  // Decide layout after mount (avoids hydration mismatch — SSR renders desktop).
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setStacked(window.innerWidth < 768 || reduced);
  }, []);

  useEffect(() => {
    if (stacked) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    const header = headerRef.current;
    if (!section || !track || !header) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced || window.innerWidth < 768) return;

    let ctx: gsap.Context | undefined;
    const timer = setTimeout(() => {
      ctx = gsap.context(() => {
        const totalWidth = track.scrollWidth;
        const viewportWidth = window.innerWidth;

        // Horizontal track translation, driven by vertical scroll progress.
        const horizontal = gsap.to(track, {
          x: -(totalWidth - viewportWidth + 200),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
            pin: false, // sticky CSS handles the pinning
            invalidateOnRefresh: true,
          },
        });

        // Header fades out within the first 15% of scroll.
        gsap.to(header, {
          opacity: 0,
          y: -30,
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "15% top",
            scrub: true,
          },
        });

        // Per-card inner parallax: visual scales 1.1 → 1.0 as the card crosses
        // the viewport (tied to the horizontal tween via containerAnimation).
        const visuals = track.querySelectorAll<HTMLElement>(
          ".work-card-parallax"
        );
        visuals.forEach((visual) => {
          const card = visual.closest(".work-card") as HTMLElement | null;
          if (!card) return;
          gsap.fromTo(
            visual,
            { scale: 1.1 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                containerAnimation: horizontal,
                start: "left right",
                end: "center center",
                scrub: true,
              },
            }
          );
        });

        ScrollTrigger.refresh();
      }, sectionRef);
    }, 100);

    return () => {
      clearTimeout(timer);
      ctx?.revert();
    };
  }, [stacked]);

  // ── Mobile / reduced-motion: simple vertical stack ──
  if (stacked) {
    return (
      <section
        ref={sectionRef}
        id="work"
        className="mx-auto max-w-[1400px] px-6 py-20"
      >
        <div className="mb-10">
          <p className="eyebrow mb-4" style={{ color: "var(--muted)" }}>
            02 — Selected work
          </p>
          <h2
            className="font-display font-bold leading-[1.05]"
            style={{ fontSize: "clamp(28px,3.4vw,36px)", letterSpacing: "-1px" }}
          >
            Worlds we&rsquo;ve built.
          </h2>
        </div>
        <div className="flex flex-col gap-5">
          {PROJECTS.map((p, i) => (
            <WorkCard key={p.id} project={p} index={i} stacked />
          ))}
        </div>
      </section>
    );
  }

  // ── Desktop: pinned horizontal scroll track ──
  return (
    <section ref={sectionRef} id="work" style={{ height: "300vh" }}>
      <div
        ref={stickyRef}
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Section header — fades out as scroll starts */}
        <div
          ref={headerRef}
          style={{ position: "absolute", top: 60, left: 36, zIndex: 2 }}
        >
          <div className="eyebrow mb-3" style={{ color: "var(--muted)" }}>
            02 — Selected work
          </div>
          <h2
            className="font-display font-bold leading-[1.05]"
            style={{ fontSize: "clamp(28px,3.4vw,36px)", letterSpacing: "-1px" }}
          >
            Worlds we&rsquo;ve built.
          </h2>
        </div>

        {/* Horizontal track */}
        <div
          ref={trackRef}
          style={{
            display: "flex",
            gap: 20,
            paddingLeft: "40vw",
            paddingRight: "20vw",
            willChange: "transform",
          }}
        >
          {PROJECTS.map((p, i) => (
            <WorkCard key={p.id} project={p} index={i} stacked={false} />
          ))}
        </div>
      </div>
    </section>
  );
}
