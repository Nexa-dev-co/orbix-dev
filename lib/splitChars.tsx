import { Fragment } from "react";

// Non-breaking space (U+00A0) — kept as an escape so inline-block spaces
// don't collapse, without embedding a literal NBSP in source.
const NBSP = String.fromCharCode(0xa0);

/**
 * Splits `text` into individually-wrapped <span class="char"> elements so GSAP
 * can animate each glyph. The visible glyphs are aria-hidden and the real text
 * is exposed via aria-label for screen readers.
 */
export function SplitChars({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <Fragment key={i}>
          <span
            className="char"
            style={{ display: "inline-block" }}
            aria-hidden="true"
          >
            {char === " " ? NBSP : char}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
