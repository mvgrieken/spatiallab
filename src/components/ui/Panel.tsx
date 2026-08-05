/** The standard bordered surface every screen of an experiment lives in. */
export function Panel({
  padded = true,
  className,
  children,
}: {
  padded?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border border-line bg-surface${padded ? " p-5 sm:p-7" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
