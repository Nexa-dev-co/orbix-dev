import { displayHostname } from '@/lib/displayHostname';
import { isSafeExternalUrl } from '@/lib/isSafeExternalUrl';

/**
 * The link out to a project itself, shown as its bare domain.
 *
 * ── Why this is a component and not a styled anchor at each call site ────────────────────────────
 * Three places render it — the works field's detail block, the same block's phone drawer, and the
 * `/lite` document — and they are the same control in all three: same destination, same label
 * derivation, same `rel`, same analytics name. The two things that must not drift are the ones a
 * copy would drift on first: `rel="noopener noreferrer"` beside `target="_blank"`, and the fact that
 * the visible text is a DERIVED hostname rather than the href. One definition, three callers.
 *
 * ── ⚠ It renders nothing without a URL, and that is the caller's happy path ──────────────────────
 * Most projects have no public address — behind a client's login, under an NDA, or taken down — so
 * the null branch is the common one rather than an error case. Callers pass `url` straight through
 * and get no element, no spacing and no empty state.
 *
 * It renders nothing for an UNSAFE url too, by the same branch, which is why the scheme check lives
 * in here rather than at the resolver: "there is no link to show" already had a designed answer, so
 * refusing a dangerous one costs no new state anywhere on the site.
 */
interface ProjectLinkProps {
  /** The project's `liveUrl`. Null, undefined or empty renders nothing at all. */
  url: string | null | undefined;
  /** Extra class for the surface it sits on — `drawer-link` and `doc-link` trim the hairline. */
  className?: string;
}

export default function ProjectLink({ url, className }: ProjectLinkProps) {
  if (!url) {
    return null;
  }

  // ── ⚠ The scheme is checked HERE, at the last point before the DOM ───────────────────────────
  // Not in `resolveWorksProjects`, and not left to the panel. The panel's validation is the message
  // an editor can act on; this is the one that actually holds, because it is the only place every
  // caller must pass through — including whichever call site somebody adds next. An `href` is the
  // one field on this site where a `javascript:` scheme is a script running on our own origin, so
  // "the upstream form already checks it" is not a load-bearing statement. See isSafeExternalUrl.
  if (!isSafeExternalUrl(url)) {
    // Refusing SILENTLY would be its own bug — an editor who published a link and cannot find it on
    // the page has nothing to go on. Dev only, matching how `resolveWorksProjects` warns about a
    // project count it will still honour.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[works] refused a project link that is not http(s): ${url} — no link rendered. Fix the ` +
          'address in the panel; a scheme-less or javascript: URL is never published.',
      );
    }
    return null;
  }

  return (
    <a
      className={className ? `works-detail-link ${className}` : 'works-detail-link'}
      href={url}
      target="_blank"
      // ⚠ Both keywords, not just `noopener`. `noreferrer` is what stops the destination's analytics
      // being handed the exact page a visitor was standing on when they left — and on this site that
      // page is one URL for the whole journey, so the referrer says nothing useful anyway.
      rel="noopener noreferrer"
      data-journey="Works: open project link"
    >
      {/* The span exists so the underline can track the TEXT and leave the glyph alone — an
          underline running beneath an arrow reads as a strikethrough through it. */}
      <span className="works-detail-link-host">{displayHostname(url)}</span>
      <LaunchGlyph />
    </a>
  );
}

// Drawn rather than typed as "↗": the character's weight and baseline are the font's business, and
// it sits noticeably heavier than the hairline it labels here.
function LaunchGlyph() {
  return (
    <svg
      className="works-detail-link-glyph"
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.2 6.8L6.8 2.2M3.4 2.2h3.4v3.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
