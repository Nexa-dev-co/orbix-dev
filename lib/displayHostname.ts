/**
 * An absolute URL reduced to the part a reader recognises: `https://www.aphelion.com/work/desk`
 * becomes `aphelion.com`.
 *
 * ── Why the site shows a domain rather than "Visit site" ─────────────────────────────────────────
 * A project link is EVIDENCE — it is the section quietly proving the paragraph above it is true —
 * and a domain does that where a generic label cannot: it names the thing, it tells the reader where
 * the click goes before they take it, and it is the one piece of a project's copy that nobody at
 * this studio wrote. "Visit site" is a button. `aphelion.com` is a receipt.
 *
 * ── ⚠ It never returns an empty string ───────────────────────────────────────────────────────────
 * A link whose visible text is "" is a 0px hit target that reads as a rendering bug, so every branch
 * ends at something printable, falling back to the trimmed input itself.
 *
 * Its one caller (`ProjectLink`) now refuses anything that is not `http(s)` BEFORE reaching this, so
 * in practice the parse always succeeds. The unparseable branch is kept anyway: this is a display
 * helper and the day something calls it without that guard, a printable label is a far better
 * failure than a blank one. ⚠ It is NOT a security check and must never be mistaken for one —
 * `lib/isSafeExternalUrl.ts` is what decides whether a URL may be rendered at all.
 */

/** Prefixes worth hiding: they are noise in a label, and every reader supplies them mentally. */
const HIDDEN_PREFIXES = ['www.'];

export function displayHostname(url: string): string {
  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return '';
  }

  // `URL` throws on anything it cannot parse rather than returning null, and the input here is
  // ultimately editor-supplied — so the parse is the branch, not a guard before it.
  let hostname: string;
  try {
    hostname = new URL(trimmed).hostname;
  } catch {
    // Not parseable as an absolute URL. Strip what a scheme and a path would have been and show
    // whatever is left, which for the realistic failure — someone typed `aphelion.com/work` — is
    // exactly the right answer anyway.
    const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    const withoutPath = withoutScheme.split('/')[0];
    return stripHiddenPrefix(withoutPath) || trimmed;
  }

  return stripHiddenPrefix(hostname) || trimmed;
}

function stripHiddenPrefix(hostname: string): string {
  const lowered = hostname.toLowerCase();
  const prefix = HIDDEN_PREFIXES.find((candidate) => lowered.startsWith(candidate));
  // ⚠ Sliced off the ORIGINAL rather than the lowercased copy: hostnames are case-insensitive but
  // this string is about to be rendered, and quietly downcasing an editor's `Aphelion.com` is a
  // change to their copy rather than a normalisation of a URL.
  return prefix ? hostname.slice(prefix.length) : hostname;
}
