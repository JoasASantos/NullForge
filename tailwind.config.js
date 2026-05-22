/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     "var(--bg-base)",
          surface:  "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          overlay:  "var(--bg-overlay)",
        },
        border:   "var(--border)",
        surface:  "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        accent: {
          red:    "var(--accent-red)",
          green:  "var(--accent-green)",
          blue:   "var(--accent-blue)",
          yellow: "var(--accent-yellow)",
          purple: "var(--accent-purple)",
          orange: "var(--accent-orange)",
          cyan:   "var(--accent-cyan)",
          pink:   "var(--accent-pink)",
        },
        text: {
          primary: "var(--text-primary)",
          muted:   "var(--text-muted)",
          dim:     "var(--text-dim)",
        },
        semantic: {
          danger:  "var(--color-danger)",
          warning: "var(--color-warning)",
          success: "var(--color-success)",
          info:    "var(--color-info)",
          rop:     "var(--color-rop)",
        },
      },
      fontFamily: {
        ui:   ["var(--font-ui)"],
        mono: ["var(--font-mono)"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm:          "var(--shadow-sm)",
        md:          "var(--shadow-md)",
        lg:          "var(--shadow-lg)",
        "glow-red":    "var(--shadow-glow-red)",
        "glow-blue":   "var(--shadow-glow-blue)",
        "glow-purple": "var(--shadow-glow-purple)",
      },
      transitionDuration: {
        fast:   "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow:   "var(--duration-slow)",
      },
    },
  },
  plugins: [],
};
