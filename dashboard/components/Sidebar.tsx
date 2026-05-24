"use client";
import { Logo } from "./Logo";

type NavItem = { label: string; href: string; active?: boolean; count?: number; shortcut?: string };

const NAV: NavItem[] = [
  { label: "Runs",        href: "#runs",        active: true, count: undefined, shortcut: "G then R" },
  { label: "Schedules",   href: "#schedules",   shortcut: "G then S" },
  { label: "Connections", href: "#connections", shortcut: "G then C" },
  { label: "Settings",    href: "#settings",    shortcut: "G then ," },
];

export function Sidebar() {
  return (
    <aside className="w-[220px] shrink-0 border-r border-border bg-bg flex flex-col h-screen sticky top-0">
      {/* Top: brand + workspace */}
      <div className="px-4 pt-4 pb-3">
        <Logo />
        <div className="mt-4 flex items-center justify-between text-sm text-fg-muted">
          <span className="truncate">synth-hackathon-2026</span>
          <kbd className="f-mono text-2xs text-fg-faint border border-border-soft px-1 py-0.5 rounded-xs">⌘K</kbd>
        </div>
      </div>

      <Divider />

      {/* Nav */}
      <nav className="px-2 py-2 space-y-px">
        {NAV.map((it) => (
          <a
            key={it.label}
            href={it.href}
            className={`group flex items-center justify-between px-2 py-1.5 rounded-sm text-sm transition-colors
              ${it.active
                ? "bg-bg-elev-2 text-fg"
                : "text-fg-muted hover:bg-bg-elev-1 hover:text-fg"}`}
          >
            <span className="flex items-center gap-2.5">
              <NavIcon name={it.label} active={!!it.active} />
              {it.label}
            </span>
            {it.shortcut && (
              <span className="hidden group-hover:inline f-mono text-2xs text-fg-dim">
                {it.shortcut}
              </span>
            )}
          </a>
        ))}
      </nav>

      <Divider />

      {/* Live agent activity widget */}
      <div className="px-4 py-3">
        <p className="kicker">Agent</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-ok pulse" />
          <span className="text-sm text-fg">online</span>
          <span className="text-xs text-fg-faint ml-auto f-mono">v0.1.0</span>
        </div>
        <p className="text-xs text-fg-faint mt-1.5">
          gemini-3.1-pro-preview · us-central1
        </p>
      </div>

      <div className="mt-auto px-4 py-3">
        <p className="kicker">Connected</p>
        <ul className="mt-2 space-y-1 text-sm text-fg-muted">
          <li className="flex items-center justify-between">
            <span>Engine</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ok" />
              <span className="text-xs">healthy</span>
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>Firestore</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ok" />
              <span className="text-xs">healthy</span>
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>Fivetran</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-warn" />
              <span className="text-xs">setup</span>
            </span>
          </li>
        </ul>
      </div>
    </aside>
  );
}

function Divider() {
  return <div className="h-px bg-border mx-3" />;
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "var(--fg)" : "var(--fg-faint)";
  switch (name) {
    case "Runs":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5">
          <rect x="2" y="3" width="12" height="2" />
          <rect x="2" y="7" width="9"  height="2" />
          <rect x="2" y="11" width="6"  height="2" />
        </svg>
      );
    case "Schedules":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4v4l3 1.5" />
        </svg>
      );
    case "Connections":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5">
          <circle cx="3.5" cy="8" r="2" />
          <circle cx="12.5" cy="8" r="2" />
          <path d="M5.5 8h5" />
        </svg>
      );
    case "Settings":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5">
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5l1.5-1.5M11 5l1.5-1.5" />
        </svg>
      );
    default:
      return null;
  }
}
