import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        muted: "#6B6B6B",
        surface: "#F5F5F7",
        accent: "#492FFB",
        "accent-hover": "#544FFF",
        sky: "#EEF8FF",
        "sky-border": "#A5CDF0",
        "sky-text": "#7D9EBC",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        btn: "10px",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(to bottom right, #EEF8FF, #FFFFFF, #EEF8FF)",
      },
    },
  },
  plugins: [],
};
export default config;
