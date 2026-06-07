import TimelineSection from "./TimelineSection";
import ValuesSection from "./ValuesSection";
import TeamSection from "./TeamSection";

// About page composition root.
export default function AboutView() {
  return (
    <>
      <section className="mx-auto w-full max-w-4xl px-6 pb-8 pt-36 md:pt-44">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          About
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight text-text md:text-6xl">
          A studio obsessed with how things perform.
        </h1>
        <p className="mt-6 max-w-2xl font-body text-base text-text-muted md:text-lg">
          We&apos;re a small, senior team that treats speed, craft, and motion as
          one discipline — and ships digital products we&apos;re proud to put our
          name on.
        </p>
      </section>

      <TimelineSection />
      <ValuesSection />
      <TeamSection />
    </>
  );
}
