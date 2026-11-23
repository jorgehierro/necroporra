import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "#111827",
          hover: "#1f2937",
          card: "#182234",
          border: "rgba(255, 255, 255, 0.08)",
        },
        gold: {
          50: "#fdf8e6",
          100: "#faefbe",
          200: "#f6df80",
          300: "#f2cf42",
          400: "#ecc01c",
          500: "#c9a84c",
          600: "#a98632",
        },
      },
    },
  },
  plugins: [],
};
export default config;
