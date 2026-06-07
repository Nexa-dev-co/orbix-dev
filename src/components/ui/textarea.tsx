import { forwardRef } from "react";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const BASE_CLASSES =
  "w-full rounded-md border border-border bg-surface px-4 py-3 font-body text-sm text-text placeholder:text-text-muted transition-colors duration-200 resize-y min-h-32 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-glow)] disabled:opacity-50";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...textareaProps }, ref) => (
    <textarea
      ref={ref}
      className={`${BASE_CLASSES} ${className}`}
      {...textareaProps}
    />
  )
);
Textarea.displayName = "Textarea";

export default Textarea;
