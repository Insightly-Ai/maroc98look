import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "maroc-red": "#C1272D",
        "maroc-green": "#006233",
      },
    },
  },
  plugins: [],
};
export default config;
