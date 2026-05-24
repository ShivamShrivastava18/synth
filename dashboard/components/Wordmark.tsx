/**
 * The Synth wordmark — a serif logotype with letter-spaced kerning that
 * doubles as the page header. The "y" gets its own optical adjustment
 * via Fraunces's "SOFT" axis.
 */
export function Wordmark({ size = "lg" }: { size?: "sm" | "lg" }) {
  const cls =
    size === "lg"
      ? "text-[44px] leading-none tracking-tightest"
      : "text-[20px] leading-none tracking-tightest";
  return (
    <span
      className={`font-display font-medium text-ink ${cls}`}
      style={{ fontVariationSettings: '"SOFT" 50, "opsz" 144' }}
    >
      Synth
    </span>
  );
}
