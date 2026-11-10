/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beach: {
          sand: '#f4dec3',
          'sand-dark': '#dfba87',
          court: '#d4a373',
          ocean: '#0284c7',
          'ocean-dark': '#0369a1',
          sunset: '#f97316',
        },
        card: {
          orange: '#f97316',
          blue: '#2563eb',
          green: '#16a34a',
          gold: '#eab308',
        },
      },
    },
  },
  plugins: [],
}
