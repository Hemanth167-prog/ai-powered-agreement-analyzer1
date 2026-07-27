/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--color-ink)",
          raised: "var(--color-ink-raised)",
          border: "var(--color-ink-border)",
        },
        paper: "var(--color-paper)",
        seal: {
          DEFAULT: "var(--color-seal)",
          bright: "var(--color-seal-bright)",
        },
        risk: {
          high: "var(--color-risk-high)",
          medium: "var(--color-risk-medium)",
          low: "var(--color-risk-low)",
        },
        muted: "var(--color-muted)",
      },
      fontFamily: {
        display: ["'Manrope'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
