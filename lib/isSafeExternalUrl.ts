/**
 * Whether a string is safe to put in an `href` that leaves this site.
 *
 * ── Why this exists when the panel already validates ─────────────────────────────────────────────
 * The panel refuses anything without an `http(s)` scheme when an editor presses save, and that is
 * the right place for the message a person can act on. It is NOT a guarantee this repo may rely on.
 * What arrives here is a JSON document fetched over HTTP from a different repository with no shared
 * package between them — `lib/cms/publishedContent.ts` says so at the top and in capitals. A direct
 * database write, a seed script, a panel change, or an altered release row all reach an `href`
 * without ever passing through that form.
 *
 * `resolveWorksProjects` already declines to trust the payload's `discipline` and narrows it with
 * `isDisciplineId`. Validating an enum from that document while trusting a URL from it would be an
 * odd place to draw the line — a bad enum costs a mislabelled CTA, a bad URL costs script execution
 * on the visitor's origin.
 *
 * ⚠ THE TEST IS THE PROTOCOL, NOT WHETHER IT PARSES. `new URL('javascript:alert(1)')` parses
 * perfectly happily and yields `protocol === 'javascript:'` — so a try/catch around the constructor
 * on its own rejects nothing that matters. `data:` and `vbscript:` are the same shape of problem.
 *
 * Protocol-relative input (`//evil.com`) is refused as a side effect and correctly: with no base to
 * resolve against, the constructor throws, and a scheme-less address is not something an editor
 * should be publishing as a link out anyway.
 */

/** The only two schemes a project link may use. Anything else is refused without exception. */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export function isSafeExternalUrl(url: string): boolean {
  try {
    // `protocol` comes back lowercased and with its colon, so `HTTPS://x.com` matches without any
    // normalising of our own.
    return ALLOWED_PROTOCOLS.includes(new URL(url.trim()).protocol);
  } catch {
    // Not an absolute URL at all — a bare domain, a relative path, or something malformed.
    return false;
  }
}
