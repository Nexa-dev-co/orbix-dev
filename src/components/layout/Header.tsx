import Link from "next/link";

interface NavigationLink {
  label: string;
  href: string;
}

const NAVIGATION_LINKS: NavigationLink[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/*
  Top navigation. Hidden until the loading sequence finishes: the
  data-reveal-on-load hook (see globals.css) keeps it at opacity 0 until
  body[data-loaded="true"] is set by LoadingOverlay, then fades it in.
*/
export default function Header() {
  return (
    <header
      data-reveal-on-load
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 md:px-12"
    >
      <Link
        href="/"
        className="font-display text-xl font-bold tracking-tight text-text"
      >
        NEXA
      </Link>

      <nav className="flex items-center gap-6 md:gap-8">
        {NAVIGATION_LINKS.map((navigationLink) => (
          <Link
            key={navigationLink.href}
            href={navigationLink.href}
            className="font-body text-sm text-text-muted transition-colors duration-200 hover:text-text"
          >
            {navigationLink.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
