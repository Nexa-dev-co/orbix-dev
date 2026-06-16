"use client";

const ITEMS = [
  "SaaS Platforms",
  "E-commerce",
  "Marketing Sites",
  "Mobile PWA",
  "Motion Design",
  "UI/UX Design",
  "Brand Systems",
];

function Track({ ariaHidden = false }: { ariaHidden?: boolean }) {
  // Render the items twice inside a single track and translate by -50% so the
  // loop is seamless. The whole strip is duplicated again in the parent for an
  // unbroken edge-to-edge ribbon.
  const sequence = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee" aria-hidden={ariaHidden}>
      {sequence.map((item, i) => (
        <span key={i} className="flex items-center whitespace-nowrap">
          <span
            className="px-6 text-[10px] uppercase"
            style={{ letterSpacing: "2px", color: "var(--muted)" }}
          >
            {item}
          </span>
          <span style={{ color: "var(--accent)" }}>✦</span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <div className="marquee-group relative w-full overflow-hidden py-4">
      <Track />
    </div>
  );
}
