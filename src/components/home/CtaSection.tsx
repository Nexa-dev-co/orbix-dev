"use client";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const PRIMARY_CTA_CLASSES =
  "inline-flex items-center justify-center rounded-full bg-accent px-8 h-12 font-body text-sm font-medium text-bg transition-colors duration-200 hover:bg-accent-dim";

// Closing call-to-action that drives toward the contact page.
export default function CtaSection() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      className="mx-auto w-full max-w-4xl px-6 py-32 text-center md:py-44"
    >
      <h2
        data-reveal
        className="font-display text-4xl font-bold leading-tight tracking-tight text-text md:text-6xl"
      >
        Let&apos;s build something that performs.
      </h2>
      <p
        data-reveal
        className="mx-auto mt-6 max-w-xl font-body text-base text-text-muted"
      >
        Tell us about your product and where you want it to go. We&apos;ll take it
        from there.
      </p>
      <div data-reveal className="mt-10">
        <Link href="/contact" className={PRIMARY_CTA_CLASSES}>
          Start a project
        </Link>
      </div>
    </section>
  );
}
