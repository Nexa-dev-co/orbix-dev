"use client";

import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { gsap, useGSAP } from "@/lib/hooks/useGsap";
import MagneticButton from "@/components/ui/MagneticButton";

const LINKS = ["Work", "Services", "Studio", "Stories"];

function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display text-[18px] font-extrabold tracking-tight ${className}`}
    >
      orb<span style={{ color: "var(--accent)" }}>i</span>x
    </span>
  );
}

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Fade the bottom border in once the user scrolls past 60px.
  useGSAP(
    () => {
      const border = borderRef.current;
      if (!border) return;

      gsap.set(border, { opacity: 0 });
      const onScroll = () => {
        gsap.to(border, {
          opacity: window.scrollY > 60 ? 1 : 0,
          duration: 0.4,
          ease: "power2.out",
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    },
    { scope: navRef }
  );

  return (
    <header
      ref={navRef}
      className="fixed inset-x-0 top-0 z-[100] w-full"
      style={{
        background: "rgba(6,6,6,0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      {/* animated bottom border */}
      <div
        ref={borderRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "var(--border)" }}
      />

      <nav className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between px-6 md:px-10">
        {/* Left: logo */}
        <a href="#top" data-cursor="link" aria-label="orbix home">
          <Logo />
        </a>

        {/* Center: nav links (desktop) */}
        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">
          {LINKS.map((link) => (
            <li key={link}>
              <a
                href={`#${link.toLowerCase()}`}
                data-cursor="link"
                className="text-[12px] tracking-wide text-fg/70 transition-colors duration-300 hover:text-fg"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        {/* Right: CTA (desktop) */}
        <MagneticButton className="hidden md:inline-block" strength={0.3}>
          <a
            href="#contact"
            data-cursor="link"
            className="group inline-flex items-center gap-2 rounded-full px-5 py-2 text-[12px] tracking-wide text-fg transition-colors duration-300 hover:text-white"
            style={{ border: "0.5px solid var(--border)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Start a project <span aria-hidden>↗</span>
          </a>
        </MagneticButton>

        {/* Mobile: hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          data-cursor="link"
          onClick={() => setOpen(true)}
          className="md:hidden"
        >
          <Menu size={22} strokeWidth={1.5} />
        </button>
      </nav>

      {/* Mobile full-screen overlay */}
      <div
        className={`fixed inset-0 z-[110] flex flex-col bg-bg transition-[opacity,visibility] duration-300 md:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="flex h-[68px] items-center justify-between px-6">
          <Logo />
          <button
            type="button"
            aria-label="Close menu"
            data-cursor="link"
            onClick={() => setOpen(false)}
          >
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>
        <ul className="flex flex-1 flex-col justify-center gap-8 px-6">
          {LINKS.map((link) => (
            <li key={link}>
              <a
                href={`#${link.toLowerCase()}`}
                onClick={() => setOpen(false)}
                className="font-display text-4xl font-extrabold tracking-tight"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#contact"
          onClick={() => setOpen(false)}
          className="m-6 rounded-full px-5 py-4 text-center text-sm text-white"
          style={{ background: "var(--accent)" }}
        >
          Start a project ↗
        </a>
      </div>
    </header>
  );
}
