"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

interface TeamMember {
  name: string;
  role: string;
}

const TEAM: TeamMember[] = [
  { name: "Mara Vance", role: "Founder · Strategy" },
  { name: "Idris Cole", role: "Engineering Lead" },
  { name: "Lena Park", role: "Design Director" },
  { name: "Theo Marsh", role: "Motion & 3D" },
  { name: "Sana Okoro", role: "Product Design" },
  { name: "Caleb Ruiz", role: "Performance Eng." },
];

// Derives the initials shown in the avatar block.
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

export default function TeamSection() {
  const sectionRef = useScrollReveal<HTMLElement>({ stagger: 0.08 });

  return (
    <section ref={sectionRef} className="mx-auto w-full max-w-6xl px-6 py-24">
      <h2
        data-reveal
        className="font-display text-3xl font-bold tracking-tight text-text md:text-4xl"
      >
        The team
      </h2>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((member) => (
          <div
            data-reveal
            key={member.name}
            className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border font-mono text-sm text-accent">
              {getInitials(member.name)}
            </span>
            <span>
              <span className="block font-display text-base font-semibold text-text">
                {member.name}
              </span>
              <span className="block font-mono text-xs text-text-muted">
                {member.role}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
