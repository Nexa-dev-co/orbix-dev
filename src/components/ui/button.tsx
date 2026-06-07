import { forwardRef } from "react";

type ButtonVariant = "primary" | "outline" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-full font-body text-sm font-medium px-6 h-12 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-bg hover:bg-accent-dim",
  outline: "border border-border text-text hover:border-accent hover:text-accent",
  ghost: "text-text-muted hover:text-text",
};

// shadcn-style primitive, restyled to Nexa tokens. forwardRef so React Hook Form
// and other ref consumers work.
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...buttonProps }, ref) => (
    <button
      ref={ref}
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
      {...buttonProps}
    />
  )
);
Button.displayName = "Button";

export default Button;
