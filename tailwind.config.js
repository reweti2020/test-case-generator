/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // VelocityQA colors
        primary: {
          DEFAULT: "hsl(180, 74%, 45%)", // #20C5C6 teal
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "hsl(19, 100%, 50%)", // #ff5500 orange
          foreground: "#ffffff", 
        },
        background: "#0f172a", // dark blue background
        foreground: "#f8fafc", // light text
        card: "#1e293b",
        "card-foreground": "#f8fafc",
        border: "#334155",
        muted: "#1e293b",
        "muted-foreground": "#94a3b8",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
