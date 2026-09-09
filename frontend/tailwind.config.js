/** @type {import('tailwindcss').Config} */
// MetroScan operational-editorial tokens (frontend-only):
// ink/paper/rules, restrained blue action, muted semantic colors.
// Flat surfaces, sharp radii, shadows only for overlays.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#10151C",
          navy2: "#1A212B",
          primary: "#1D4ED8",
          primaryDark: "#1E40AF",
          highlight: "#3B82F6",
        },
        paper: "#F6F5F1",
        canvas: "#F6F5F1",
        surface: "#FFFFFF",
        tone: "#EFEDE7",
        ink: "#1A1D21",
        muted: "#5C6470",
        faint: "#8A919C",
        rule: "#E0DED6",
        ok: "#2E7D4F",
        okSoft: "#E7F2EB",
        warn: "#92600A",
        warnSoft: "#FAF0D7",
        bad: "#B3261E",
        badSoft: "#F9E8E6",
      },
      boxShadow: {
        card: "none",
        pop: "0 8px 24px rgba(16,21,28,.16)",
      },
      borderRadius: {
        card: "8px",
      },
      maxWidth: {
        shell: "80rem",
      },
      fontFamily: {
        sans: [
          "Inter", "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"',
          "Roboto", '"Helvetica Neue"', "Arial", "sans-serif",
        ],
        mono: [
          "ui-monospace", "SFMono-Regular", "Menlo", "Consolas",
          '"Liberation Mono"', "monospace",
        ],
      },
    },
  },
  plugins: [],
};
