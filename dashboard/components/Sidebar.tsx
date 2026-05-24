"use client";
import { useState } from "react";
import { Logo } from "./Logo";

type NavItem = { label: string; href: string; shortcut?: string };

const NAV: NavItem[] = [
  { label: "Runs",        href: "#runs",        shortcut: "G R" },
  { label: "Schedules",   href: "#schedules",   shortcut: "G S" },
  { label: "Connections", href: "#connections", shortcut: "G C" },
  { label: "Settings",    href: "#settings",    shortcut: "G ," },
];

export function Sidebar() {
  const [active, setActive] = useState("Runs");
  return (
    <aside className="w-[224px] shrink-0 border-r border-border bg-bg flex flex-col h-screen sticky top-0">
      {/* Top: brand + workspace */}
      <div className="px-4 pt-4 pb-3">
        <Logo />
        <button className="lift mt-4 w-full flex items-center justify-between text-sm text-fg-muted border border-border-soft rounded-sm px-2 py-1.5 hover:border-fg-dim hover:bg-bg-elev-1">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ok pulse" />
            <span className="truncate">synth-hackathon-2026</span>
          </span>
          <span className="text-fg-dim text-2xs">▾</span>
        </button>
      </div>

      <Divider />

      {/* Nav */}
      <nav className="px-2 py-2 space-y-px">
        {NAV.map((it) => {
          const isActive = active === it.label;
          return (
            <a
              key={it.label}
              href={it.href}
              onClick={(e) => {
                e.preventDefault();
                setActive(it.label);
              }}
              className={`relative group flex items-center justify-between px-2 py-1.5 rounded-sm text-sm transition-base
                ${isActive
                  ? "bg-bg-elev-2 text-fg"
                  : "text-fg-muted hover:bg-bg-elev-1 hover:text-fg"}`}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-accent rounded-r"
                />
              )}
              <span className="flex items-center gap-2.5 ml-1">
                <NavIcon name={it.label} active={isActive} />
                {it.label}
              </span>
              {it.shortcut && (
                <span className="opacity-0 group-hover:opacity-100 transition-fast f-mono text-2xs text-fg-dim">
                  {it.shortcut}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      <Divider />

      {/* Agent activity */}
      <div className="px-4 py-3">
        <p className="kicker">Agent</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="relative inline-flex items-center justify-center" style={{ width: 7, height: 7 }}>
            <span
              className="absolute inset-0 rounded-full ring-pulse"
              style={{ background: "var(--ok)" }}
            />
            <span className="relative inline-block w-[7px] h-[7px] rounded-full" style={{ background: "var(--ok)" }} />
          </span>
          <span className="text-sm text-fg">online</span>
          <span className="text-2xs text-fg-faint ml-auto f-mono">v0.1.0</span>
        </div>
        <p className="text-xs text-fg-faint mt-1.5 f-mono">
          gemini-3.1-pro-preview
        </p>
        <p className="text-2xs text-fg-dim f-mono">us-central1 · global</p>
      </div>

      <Divider />

      {/* Connected services with brand-tinted icons */}
      <div className="px-4 py-3">
        <p className="kicker">Connected</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <ConnectionRow icon="postgres"  label="Postgres"   tone="ok"   note="prod + staging" />
          <ConnectionRow icon="firestore" label="Firestore"  tone="ok"   note="us-central1"    />
          <ConnectionRow icon="fivetran"  label="Fivetran"   tone="warn" note="needs setup"    />
        </ul>
      </div>

      <div className="mt-auto px-4 py-3 border-t border-border">
        <a
          href="https://github.com/ShivamShrivastava18/synth"
          className="flex items-center justify-between text-xs text-fg-faint hover:text-fg-muted transition-fast"
        >
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.16-.89-1.16-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.74-3.65 3.94.29.25.54.74.54 1.49v2.2c0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            github / synth
          </span>
          <span className="text-fg-dim">↗</span>
        </a>
      </div>
    </aside>
  );
}

function Divider() {
  return <div className="h-px bg-border mx-3" />;
}

function ConnectionRow({
  icon,
  label,
  tone,
  note,
}: {
  icon: "postgres" | "firestore" | "fivetran";
  label: string;
  tone: "ok" | "warn" | "danger";
  note: string;
}) {
  const dot = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : "var(--danger)";
  return (
    <li className="flex items-center gap-2 transition-fast hover:bg-bg-elev-1 -mx-2 px-2 py-1 rounded-sm">
      <ConnectionIcon name={icon} />
      <div className="flex-1 min-w-0">
        <p className="text-fg leading-none">{label}</p>
        <p className="text-2xs text-fg-dim mt-0.5 f-mono">{note}</p>
      </div>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} aria-hidden />
    </li>
  );
}

function ConnectionIcon({ name }: { name: "postgres" | "firestore" | "fivetran" }) {
  const sz = 14;
  if (name === "postgres") {
    return (
      <svg width={sz} height={sz} viewBox="0 0 16 16" fill="var(--tint-pgblue)" aria-hidden>
        <ellipse cx="8" cy="8" rx="6" ry="5.5" />
        <path d="M8 3.5c-2 0-3.5 1-3.5 2.5S6 8.5 8 8.5s3.5-1 3.5-2.5S10 3.5 8 3.5z" fill="var(--bg)" />
      </svg>
    );
  }
  if (name === "firestore") {
    return (
      <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M3 12L8 2l5 10-5 2z" fill="var(--tint-fsorange)" />
        <path d="M3 12l5-3 5 3-5 2z" fill="var(--tint-fsorange)" opacity="0.65" />
      </svg>
    );
  }
  // fivetran
  return (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="var(--tint-ftteal)" aria-hidden>
      <rect x="1.5" y="6.5" width="3" height="3" rx="0.5" />
      <rect x="6.5" y="3"   width="3" height="10" rx="0.5" opacity="0.75" />
      <rect x="11.5" y="6.5" width="3" height="3" rx="0.5" />
    </svg>
  );
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "var(--fg)" : "var(--fg-faint)";
  switch (name) {
    case "Runs":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5" className="transition-fast">
          <rect x="2" y="3" width="12" height="2" />
          <rect x="2" y="7" width="9"  height="2" />
          <rect x="2" y="11" width="6"  height="2" />
        </svg>
      );
    case "Schedules":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5" className="transition-fast">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4v4l3 1.5" />
        </svg>
      );
    case "Connections":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5" className="transition-fast">
          <circle cx="3.5" cy="8" r="2" />
          <circle cx="12.5" cy="8" r="2" />
          <path d="M5.5 8h5" />
        </svg>
      );
    case "Settings":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5" className="transition-fast">
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5l1.5-1.5M11 5l1.5-1.5" />
        </svg>
      );
    default:
      return null;
  }
}
