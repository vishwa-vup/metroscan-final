/** @type {import('tailwindcss').Config} */
// MetroScan design tokens (frontend-only redesign v1.0):
// navy chrome, indigo primary, semantic status colors. No backend impact.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#081224",
          navy2: "#0e1d33",
          primary: "#5B5CEB",
          primaryDark: "#4a4dd6",
          highlight: "#7C6FFF",
        },
        canvas: "#F5F7FB",
        ink: "#111827",
        muted: "#64748B",
        ok: "#20C997",
        warn: "#F5B942",
        bad: "#EF5B6B",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)",
        pop: "0 8px 24px rgba(8,18,36,.16)",
      },
      borderRadius: {
        card: "12px",
      },
      maxWidth: {
        shell: "72rem",
      },
    },
  },
  plugins: [],
};
