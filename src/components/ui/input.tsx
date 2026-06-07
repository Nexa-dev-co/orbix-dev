import { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

// Focus glow in accent (per Contact page spec), restyled to Nexa tokens.
const BASE_CLASSES =
  "w-full rounded-md border border-border bg-surface px-4 h-12 font-body text-sm text-text placeholder:text-text-muted transition-colors duration-200 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-glow)] disabled:opacity-50";

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...inputProps }, ref) => (
    <input ref={ref} className={`${BASE_CLASSES} ${className}`} {...inputProps} />
  )
);
Input.displayName = "Input";

export default Input;
