"use client";

export function TopBar({
  crumbs,
  right,
}: {
  crumbs: { label: string; href?: string; muted?: boolean }[];
  right?: React.ReactNode;
}) {
  return (
    <header className="h-12 sticky top-0 z-10 bg-bg/85 backdrop-blur border-b border-border flex items-center justify-between px-5">
      <nav className="flex items-center gap-2 text-sm">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-fg-dim">/</span>}
            <span className={c.muted ? "text-fg-muted" : "text-fg"}>{c.label}</span>
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        {right}
        <button className="h-7 px-2.5 text-xs text-fg-muted hover:text-fg border border-border rounded-sm flex items-center gap-1.5 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-ok" />
          prod
        </button>
        <kbd className="f-mono text-2xs text-fg-faint border border-border-soft px-1.5 py-0.5 rounded-xs">⌘K</kbd>
      </div>
    </header>
  );
}
