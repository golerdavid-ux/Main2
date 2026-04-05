/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0A0F1C',
        'navy-light': '#131A2E',
        'navy-lighter': '#1C2541',
        accent: '#3B82F6',
        success: '#10B981',
      },
    },
  },
  plugins: [],
}
