/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14181F",
          raised: "#1C222C",
          border: "#2A313D",
        },
        paper: "#F3F0E8",
        seal: {
          DEFAULT: "#B8863B",
          bright: "#D9A24C",
        },
        risk: {
          high: "#B2483A",
          medium: "#B8863B",
          low: "#4C7A63",
        },
        muted: "#8D93A0",
      },
      fontFamily: {
        display: ["'Source Serif 4'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
