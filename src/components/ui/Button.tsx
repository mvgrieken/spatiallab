import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "min-h-12 bg-accent px-6 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-40",
  secondary:
    "min-h-11 border border-line px-6 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground disabled:opacity-50",
  ghost:
    "min-h-11 text-sm text-faint transition-colors hover:text-foreground",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

/** The three button styles used across all experiments. No other variants. */
export function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={`${VARIANT_CLASSES[variant]}${className ? ` ${className}` : ""}`}
    />
  );
}
