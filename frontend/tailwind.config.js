/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-color)',
        surface: 'var(--surface-color)',
        primary: 'var(--primary-color)',
        'primary-hover': 'var(--primary-hover)',
        border: 'var(--border-color)',
      }
    },
  },
  plugins: [],
}
