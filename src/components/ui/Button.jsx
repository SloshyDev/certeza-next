export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const base =
    variant === "secondary"
      ? "btn-secondary"
      : variant === "accent"
      ? "btn-accent"
      : "btn-primary";
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}
