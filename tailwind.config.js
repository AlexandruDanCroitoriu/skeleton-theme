/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./layout/**/*.liquid",
    "./sections/**/*.{liquid,json}",
    "./snippets/**/*.liquid",
    "./blocks/**/*.liquid",
    "./templates/**/*.{liquid,json}",
    "./assets/**/*.{js,ts}"
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  safelist: [],
  plugins: [],
}

