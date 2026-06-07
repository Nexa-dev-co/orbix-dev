import ServicesList from "./ServicesList";

// Services page: header + full capabilities grid.
export default function ServicesView() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-28 pt-36 md:pt-44">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        Services
      </p>
      <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-text md:text-6xl">
        Everything it takes to ship a product that performs.
      </h1>
      <p className="mt-6 max-w-2xl font-body text-base text-text-muted md:text-lg">
        Strategy, design, engineering, and motion under one roof — so the work
        stays coherent from first idea to production.
      </p>

      <div className="mt-16">
        <ServicesList />
      </div>
    </section>
  );
}
