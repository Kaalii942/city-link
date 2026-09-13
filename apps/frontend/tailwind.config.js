/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f6ff',
          100: '#e0edff',
          200: '#c2ddff',
          300: '#94c4ff',
          400: '#5da0ff',
          500: '#0078d4', // Microsoft Office/Dynamics Blue
          600: '#005a9e',
          700: '#004578',
          800: '#002d50',
          900: '#001b33',
        },
        corporate: {
          bg: '#f3f2f1',     // Light grey background
          card: '#ffffff',   // White surfaces
          border: '#e0e0e0', // Subtle dividers
          text: '#323130',   // Dark grey readable text
          muted: '#605e5c',  // Muted secondary text
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        dynamics: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
        card: '0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
}
