import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./constants/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // One graphite ramp for surfaces, borders and text.
        canvas: "#F7F7F5",
        surface: "#FFFFFF",
        subtle: "#F1F1EF",
        line: "rgb(24 24 27 / 0.09)",
        "line-strong": "rgb(24 24 27 / 0.16)",
        ink: {
          DEFAULT: "#18181B",
          2: "#52525B",
          3: "#71717A",
        },
        // The one accent: the deep blue of the Horizon mark.
        brand: {
          DEFAULT: "#0058D4",
          hover: "#004BB5",
          soft: "#EDF3FC",
          deep: "#0B2A57",
        },
        positive: { DEFAULT: "#1D7A4C", soft: "#EDF6F0" },
        negative: { DEFAULT: "#B42318", soft: "#FBEEEC" },
        caution: { DEFAULT: "#93570A", soft: "#FBF3E4" },
        // Tokens the shadcn/ui primitives expect.
        background: "#FFFFFF",
        foreground: "#18181B",
        primary: { DEFAULT: "#0058D4", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#F1F1EF", foreground: "#18181B" },
        muted: { DEFAULT: "#F1F1EF", foreground: "#71717A" },
        accent: { DEFAULT: "#F1F1EF", foreground: "#18181B" },
        destructive: { DEFAULT: "#B42318", foreground: "#FFFFFF" },
        popover: { DEFAULT: "#FFFFFF", foreground: "#18181B" },
        input: "rgb(24 24 27 / 0.16)",
        ring: "#0058D4",
        border: "rgb(24 24 27 / 0.09)",
      },
      borderColor: {
        DEFAULT: "rgb(24 24 27 / 0.09)",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(24 24 27 / 0.04)",
        float: "0 1px 2px 0 rgb(15 23 42 / 0.08), 0 12px 24px -12px rgb(15 23 42 / 0.28)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.2, 0, 0, 1)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
