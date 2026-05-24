import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper:        "var(--paper)",
        "paper-soft": "var(--paper-soft)",
        "paper-fold": "var(--paper-fold)",
        surface:      "var(--surface)",
        rule:         "var(--rule)",
        "rule-thin":  "var(--rule-thin)",
        ink:          "var(--ink)",
        "ink-muted":  "var(--ink-muted)",
        "ink-faint":  "var(--ink-faint)",
        accent:       "var(--accent)",
        "accent-soft":"var(--accent-soft)",
        green:        "var(--green)",
        amber:        "var(--amber)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body:    ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono:    ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        kicker:   "0.18em",
      },
      borderRadius: {
        // We barely use rounded corners — sharp edges fit editorial.
        none: "0",
        xs:   "2px",
      },
    },
  },
  plugins: [],
};
export default config;
