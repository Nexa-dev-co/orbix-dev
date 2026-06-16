"use client";

const LINKS = ["Work", "Services", "Studio", "Contact"];

export default function Footer() {
  return (
    <footer
      className="w-full"
      style={{ borderTop: "0.5px solid var(--border)" }}
    >
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-8 px-6 py-10 md:flex-row md:justify-between md:px-10">
        {/* Logo */}
        <a href="#top" data-cursor="link" aria-label="orbix home">
          <span className="font-display text-[18px] font-extrabold tracking-tight">
            orb<span style={{ color: "var(--accent)" }}>i</span>x
          </span>
        </a>

        {/* Nav links */}
        <ul className="flex items-center gap-7">
          {LINKS.map((link) => (
            <li key={link}>
              <a
                href={`#${link.toLowerCase()}`}
                data-cursor="link"
                className="text-[11px] transition-colors duration-300 hover:text-fg"
                style={{ color: "var(--muted)" }}
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        {/* Copyright */}
        <span
          className="text-[10px]"
          style={{ color: "rgba(235,232,224,0.18)" }}
        >
          © 2026 orbix. All systems nominal.
        </span>
      </div>
    </footer>
  );
}
