/**
 * Synth logo — a 14px square mark next to the wordmark.
 * The square has a subtle inner shadow + an offset mint dot, suggesting
 * "data passes through validation". Repeatable, simple, brandable.
 */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const px = size === "lg" ? 18 : 14;
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="relative inline-block"
        style={{ width: px, height: px }}
      >
        <span
          className="absolute inset-0 border border-border bg-bg-elev-2"
          style={{ borderRadius: 3 }}
        />
        <span
          className="absolute bg-accent"
          style={{
            right: -2,
            bottom: -2,
            width: Math.round(px * 0.42),
            height: Math.round(px * 0.42),
            borderRadius: 2,
          }}
        />
      </span>
      <span
        className="font-sans font-semibold text-fg tracking-tighter"
        style={{ fontSize: size === "lg" ? 18 : 14 }}
      >
        Synth
      </span>
    </div>
  );
}
