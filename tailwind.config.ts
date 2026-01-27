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
        primary: {
          DEFAULT: "#6A1B9A", // Roxo principal
          dark: "#2E004B",
          soft: "#AB47BC",
        },
        accent: "#FF4081", // Rosa choque
        glass: {
          bg: "rgba(255, 255, 255, 0.75)",
          border: "rgba(255, 255, 255, 0.6)",
        },
      },
      backgroundImage: {
        "main-gradient": "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",
      },
    },
  },
  plugins: [],
};
export default config;