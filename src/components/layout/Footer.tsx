import Link from "next/link";

const CURRENT_YEAR = new Date().getFullYear();

/*
  Site footer. Static content, so it stays a Server Component.
*/
export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12 md:px-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <span className="font-display text-lg font-bold tracking-tight text-text">
          NEXA
        </span>

        <p className="font-mono text-xs text-text-muted">
          We build digital products that perform.
        </p>

        <div className="flex items-center gap-6">
          <Link
            href="/services"
            className="font-body text-sm text-text-muted transition-colors duration-200 hover:text-text"
          >
            Services
          </Link>
          <Link
            href="/contact"
            className="font-body text-sm text-text-muted transition-colors duration-200 hover:text-text"
          >
            Contact
          </Link>
        </div>
      </div>

      <p className="mt-8 font-mono text-xs text-text-faint">
        © {CURRENT_YEAR} Nexa Dev Studio. All rights reserved.
      </p>
    </footer>
  );
}
