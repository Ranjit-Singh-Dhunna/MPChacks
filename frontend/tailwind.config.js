/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0e17",
          900: "#0f1420",
          850: "#141b2b",
          800: "#1a2336",
          700: "#243049",
          600: "#33415f",
        },
        brim: {
          400: "#5eead4",
          500: "#2dd4bf",
          600: "#14b8a6",
        },
        accent: "#7c83ff",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
