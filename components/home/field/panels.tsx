import { CORE, HERO, ORBITS, PLANETS, STREAMS, type FieldStop } from "./content";

/**
 * The readable DOM layer for one destination. Elements carrying `data-reveal`
 * are choreographed in by the journey (a different arrival per destination);
 * `data-scramble` marks text the streams panel decodes character by
 * character. Project rows broadcast `field:hover` so the particle field forms
 * that project's planet while hovered.
 */
export default function StopPanel({ stop }: { stop: FieldStop }) {
  if (stop.kind === "hero") return <Hero stop={stop} />;

  return (
    <>
      <span className="eyebrow field-kicker" data-reveal>{stop.kicker}</span>
      <h2 className="font-display field-title" data-reveal>{stop.title}</h2>

      {stop.kind === "orbits" && <Orbits />}
      {stop.kind === "planets" && <Planets />}
      {stop.kind === "streams" && <Streams />}
      {stop.kind === "core" && <Core />}
    </>
  );
}

function Hero({ stop }: { stop: FieldStop }) {
  return (
    <div className="field-hero">
      {/* the wordmark itself is the particle formation behind this layer */}
      <h1 className="sr-only">orbix — software with gravity</h1>
      <span className="eyebrow field-kicker" data-reveal>{stop.kicker}</span>
      <p className="field-body field-hero-sub" data-reveal>{HERO.sub}</p>
      <div className="field-cue" data-reveal aria-hidden>
        <span className="eyebrow">{HERO.cue}</span>
        <span className="field-cue-line" />
      </div>
    </div>
  );
}

function Orbits() {
  return (
    <>
      <p className="field-body field-orbits-body" data-reveal>{ORBITS.body}</p>
      <ul className="field-list">
        {ORBITS.rings.map((r) => (
          <li key={r.name} className="field-list-row" data-reveal>
            <span className="eyebrow field-list-index">{r.name}</span>
            <span className="font-display field-list-label">{r.domain}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

const setHover = (index: number) =>
  window.dispatchEvent(new CustomEvent("field:hover", { detail: index }));

function Planets() {
  return (
    <ul className="field-work">
      {PLANETS.map((w, i) => (
        <li key={w.title} data-reveal>
          <a
            href="#"
            className="field-work-row"
            data-cursor="link"
            onClick={(e) => e.preventDefault()}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(-1)}
          >
            <span className="eyebrow field-work-index">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-display field-work-title">{w.title}</span>
            <span className="field-work-meta">{w.orbit}</span>
            <span className="eyebrow field-work-year">{w.year}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Streams() {
  return (
    <div className="field-steps">
      {STREAMS.map((p) => (
        <div key={p.n} className="field-step" data-reveal>
          <div className="font-display field-step-n">{p.n}</div>
          <div className="font-display field-step-title" data-scramble>{p.title}</div>
          <p className="field-step-desc">{p.desc}</p>
        </div>
      ))}
    </div>
  );
}

function Core() {
  return (
    <>
      <p className="field-body field-contact-body" data-reveal>{CORE.body}</p>
      <a href={`mailto:${CORE.email}`} className="field-cta" data-cursor="link" data-reveal>
        {CORE.email} <span aria-hidden>→</span>
      </a>
      <div className="field-contact-footer" data-reveal>
        <ul className="field-socials">
          {CORE.socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noreferrer" data-cursor="link">{s.label}</a>
            </li>
          ))}
        </ul>
        <span className="field-fineprint">© 2026 orbix</span>
      </div>
    </>
  );
}
