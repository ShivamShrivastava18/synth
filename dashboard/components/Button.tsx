import { forwardRef } from "react";

type Variant = "primary" | "danger" | "ghost";
type Size = "sm" | "md";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-black hover:bg-accent/90 disabled:bg-accent/40 disabled:text-black/60",
  danger:
    "bg-transparent border border-danger text-danger hover:bg-danger hover:text-bg disabled:opacity-40",
  ghost:
    "bg-transparent border border-border text-fg-muted hover:text-fg hover:border-fg-muted disabled:opacity-40",
};

const SIZE: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "ghost", size = "md", className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center gap-1.5 rounded-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    />
  );
});
