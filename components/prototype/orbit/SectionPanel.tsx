import { PROCESS, SERVICES, WORK, type OrbitSection } from "./sections";

const muted = { color: "var(--muted)" };

/** The readable content for one section (kicker, title and kind-specific body). */
export default function SectionPanel({ section }: { section: OrbitSection }) {
  return (
    <>
      <span className="eyebrow" style={{ color: "var(--accent)" }}>{section.kicker}</span>
      <h2
        className="font-display"
        style={{ fontWeight: 800, fontSize: "clamp(2.2rem, 6vw, 4.6rem)", lineHeight: 1.02, margin: "0.6rem 0 1.4rem", letterSpacing: "-0.01em" }}
      >
        {section.title}
      </h2>

      {section.kind === "about" && <About />}
      {section.kind === "work" && <Work />}
      {section.kind === "process" && <Process />}
      {section.kind === "services" && <Services />}
      {section.kind === "contact" && <Contact />}
    </>
  );
}

function About() {
  return (
    <>
      <p style={{ ...muted, fontSize: "1.1rem", maxWidth: 520, margin: "0 auto 2rem" }}>
        A small, fiercely focused studio crafting cinematic, story-driven web experiences — SaaS, commerce, campaigns and mobile-first apps.
      </p>
      <div style={{ display: "flex", gap: "2.5rem", justifyContent: "center", flexWrap: "wrap" }}>
        {[["Est.", "2026"], ["Missions", "40+"], ["Awards", "12"]].map(([label, value]) => (
          <div key={label}>
            <div className="font-display" style={{ fontWeight: 800, fontSize: "2rem" }}>{value}</div>
            <div className="eyebrow" style={muted}>{label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Work() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
      {WORK.map((work) => (
        <div key={work.title} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "1.3rem", background: "var(--card)" }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: "1.25rem" }}>{work.title}</div>
          <div style={{ ...muted, marginTop: "0.4rem" }}>{work.category}</div>
          <div className="eyebrow" style={{ color: "var(--accent)", marginTop: "0.8rem" }}>{work.year}</div>
        </div>
      ))}
    </div>
  );
}

function Process() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem" }}>
      {PROCESS.map((step) => (
        <div key={step.n}>
          <div className="font-display" style={{ color: "var(--accent)", fontWeight: 800, fontSize: "1.6rem" }}>{step.n}</div>
          <div className="font-display" style={{ fontWeight: 700, fontSize: "1.2rem", margin: "0.3rem 0 0.5rem" }}>{step.title}</div>
          <p style={muted}>{step.desc}</p>
        </div>
      ))}
    </div>
  );
}

function Services() {
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {SERVICES.map((service, index) => (
        <li key={service} className="font-display" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", padding: "0.7rem 0", fontWeight: 600, fontSize: "1.4rem" }}>
          <span>{service}</span>
          <span className="eyebrow" style={muted}>{String(index + 1).padStart(2, "0")}</span>
        </li>
      ))}
    </ul>
  );
}

function Contact() {
  return (
    <>
      <p style={{ ...muted, fontSize: "1.1rem", maxWidth: 460, margin: "0 auto 1.6rem" }}>
        You’ve reached the core. Enter orbit with us.
      </p>
      <a
        href="mailto:hello@orbix.studio"
        style={{ display: "inline-block", padding: "0.9rem 2rem", border: "1px solid var(--accent)", borderRadius: 999, color: "var(--fg)", textDecoration: "none", letterSpacing: "0.04em" }}
      >
        hello@orbix.studio →
      </a>
    </>
  );
}
