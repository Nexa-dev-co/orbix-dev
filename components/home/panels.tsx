import { CORE, HERO, PROCESS, STATEMENT, WORK, type DiveStop } from "./sections";

/**
 * The readable DOM layer for one dive stop. Every element carrying
 * `data-reveal` is staggered in/out by the journey (and, for the hero, by the
 * loader-handoff intro).
 */
export default function StopPanel({ stop }: { stop: DiveStop }) {
  if (stop.kind === "overview") return <Hero stop={stop} />;

  return (
    <>
      <span className="eyebrow dive-kicker" data-reveal>{stop.kicker}</span>
      <h2 className="font-display dive-title" data-reveal>{stop.title}</h2>

      {stop.kind === "statement" && <Statement />}
      {stop.kind === "work" && <Work />}
      {stop.kind === "process" && <Process />}
      {stop.kind === "core" && <Core />}
    </>
  );
}

function Hero({ stop }: { stop: DiveStop }) {
  return (
    <div className="dive-hero">
      <span className="eyebrow dive-kicker" data-reveal>{stop.kicker}</span>
      <h1 className="font-display dive-hero-title" data-reveal aria-label="orbix">
        orb<span className="dive-accent">i</span>x
      </h1>
      <p className="dive-body dive-hero-sub" data-reveal>{HERO.sub}</p>
      <div className="dive-cue" data-reveal aria-hidden>
        <span className="eyebrow">{HERO.cue}</span>
        <span className="dive-cue-line" />
      </div>
    </div>
  );
}

function Statement() {
  return (
    <>
      <p className="dive-body dive-statement-body" data-reveal>{STATEMENT.body}</p>
      <ul className="dive-list">
        {STATEMENT.capabilities.map((c, i) => (
          <li key={c} className="dive-list-row" data-reveal>
            <span className="eyebrow dive-list-index">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-display dive-list-label">{c}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Work() {
  return (
    <ul className="dive-missions">
      {WORK.map((w) => (
        <li key={w.id} data-reveal>
          <a href="#" className="dive-mission-row" data-cursor="link" onClick={(e) => e.preventDefault()}>
            <span className="eyebrow dive-mission-id">{w.id}</span>
            <span className="font-display dive-mission-title">{w.title}</span>
            <span className="dive-mission-meta">{w.category}</span>
            <span className="eyebrow dive-mission-year">{w.year}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Process() {
  return (
    <div className="dive-steps">
      {PROCESS.map((p) => (
        <div key={p.n} className="dive-step" data-reveal>
          <div className="font-display dive-step-n">{p.n}</div>
          <div className="font-display dive-step-title">{p.title}</div>
          <p className="dive-step-desc">{p.desc}</p>
        </div>
      ))}
    </div>
  );
}

function Core() {
  return (
    <>
      <p className="dive-body dive-core-body" data-reveal>{CORE.body}</p>
      <a href={`mailto:${CORE.email}`} className="dive-cta" data-cursor="link" data-reveal>
        {CORE.email} <span aria-hidden>→</span>
      </a>
      <div className="dive-core-footer" data-reveal>
        <ul className="dive-socials">
          {CORE.socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noreferrer" data-cursor="link">{s.label}</a>
            </li>
          ))}
        </ul>
        <div className="dive-fineprint">
          <span>© 2026 orbix — all systems nominal</span>
          <span>{CORE.attribution}</span>
        </div>
      </div>
    </>
  );
}
