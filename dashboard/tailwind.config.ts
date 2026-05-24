import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg:           "var(--bg)",
        "bg-elev-1":  "var(--bg-elev-1)",
        "bg-elev-2":  "var(--bg-elev-2)",
        "bg-elev-3":  "var(--bg-elev-3)",
        border:       "var(--border)",
        "border-soft":"var(--border-soft)",
        fg:           "var(--fg)",
        "fg-muted":   "var(--fg-muted)",
        "fg-faint":   "var(--fg-faint)",
        "fg-dim":     "var(--fg-dim)",
        accent:       "var(--accent)",
        "accent-soft":"var(--accent-soft)",
        ok:           "var(--ok)",
        warn:         "var(--warn)",
        danger:       "var(--danger)",
        info:         "var(--info)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "-apple-system", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.025em",
        tighter:  "-0.015em",
      },
      borderRadius: {
        none: "0",
        xs:   "3px",
        sm:   "4px",
        md:   "6px",
        lg:   "8px",
      },
      fontSize: {
        "2xs": ["10px",  { lineHeight: "1.2" }],
        xs:    ["11px",  { lineHeight: "1.4" }],
        sm:    ["12px",  { lineHeight: "1.5" }],
        base:  ["13px",  { lineHeight: "1.6" }],
        md:    ["14px",  { lineHeight: "1.5" }],
        lg:    ["16px",  { lineHeight: "1.4" }],
        xl:    ["20px",  { lineHeight: "1.3" }],
        "2xl": ["24px",  { lineHeight: "1.2" }],
        "3xl": ["32px",  { lineHeight: "1.1" }],
        "4xl": ["44px",  { lineHeight: "1.05" }],
      },
    },
  },
  plugins: [],
};
export default config;
