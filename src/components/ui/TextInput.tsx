import type { InputHTMLAttributes } from "react";

/** The standard text/email/password input, shared by all experiments. */
export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-12 w-full border border-line bg-surface px-4 text-[15px] placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-50${className ? ` ${className}` : ""}`}
    />
  );
}
