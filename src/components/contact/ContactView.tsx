import ContactForm from "./ContactForm";

// Contact page: header + form.
export default function ContactView() {
  return (
    <section className="mx-auto w-full max-w-2xl px-6 pb-28 pt-36 md:pt-44">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        Contact
      </p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight text-text md:text-5xl">
        Let&apos;s talk about your product.
      </h1>
      <p className="mt-6 font-body text-base text-text-muted md:text-lg">
        Tell us what you&apos;re building and where you want it to go. We read
        every message and reply within a couple of days.
      </p>

      <div className="mt-12">
        <ContactForm />
      </div>
    </section>
  );
}
