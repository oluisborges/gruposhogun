import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f0f0f",
        foreground: "#fafafa",
        card: {
          DEFAULT: "#171717",
          foreground: "#fafafa",
        },
        primary: {
          DEFAULT: "#ef4444",
          foreground: "#fafafa",
        },
        secondary: {
          DEFAULT: "#262626",
          foreground: "#fafafa",
        },
        muted: {
          DEFAULT: "#262626",
          foreground: "#a3a3a3",
        },
        accent: {
          DEFAULT: "#f97316",
          foreground: "#fafafa",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#fafafa",
        },
        border: "#262626",
        input: "#262626",
        ring: "#ef4444",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
