import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-instrument-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        background: "#000000",
        foreground: "#FAFAFA",
        card: "#111111",
        "card-foreground": "#ffffff",
        border: "#333333",
        primary: "#ffffff",
        "primary-foreground": "#000000",
        muted: "#222222",
        "muted-foreground": "#a3a3a3",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
