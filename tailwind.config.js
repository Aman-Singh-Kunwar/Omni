/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        omni: {
          blue: '#2563eb',
          green: '#10b981',
          purple: '#8b5cf6',
          orange: '#f59e0b'
        }
      }
    },
  },
  plugins: [],
}