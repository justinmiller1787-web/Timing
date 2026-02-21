/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        rippling: "rippling 600ms ease-out",
      },
      keyframes: {
        rippling: {
          "0%": { transform: "scale(0)", opacity: "0.6" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
}
