import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        paper: "#fdfdfc",
        darkpaper: "#0f172a",
      },
      fontFamily: {
        sans: ["var(--font-hind-siliguri)", "Hind Siliguri", "system-ui", "sans-serif"],
        serif: ["var(--font-noto-serif-bengali)", "Noto Serif Bengali", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
