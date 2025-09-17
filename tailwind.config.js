/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        wood: {
          // Light mode colors (warm oak theme)
          background: '#fefdfb',
          surface: '#ffffff',
          light: '#f8f6f0',
          medium: '#e8e1d4',
          dark: '#d4c4a8',
          border: '#d1c4a8',
          accent: '#8b5a3c',
          'accent-hover': '#7a4d32',
          text: '#2d2520',
          'text-secondary': '#6b5b4f',
          
          // Dark mode colors (rich walnut theme)
          'background-dark': '#1a1611',
          'surface-dark': '#201b16',
          'light-dark': '#2a241d',
          'medium-dark': '#3d342a',
          'dark-dark': '#4a3f34',
          'border-dark': '#3d342a',
          'accent-dark': '#d4af37',
          'accent-dark-hover': '#c19b26',
          'text-dark': '#f5f1eb',
          'text-secondary-dark': '#c4b8a6',
        },
      },
      backgroundImage: {
        'wood-grain': `
          linear-gradient(90deg, rgba(139,90,60,0.03) 50%, transparent 50%),
          linear-gradient(rgba(139,90,60,0.02) 50%, transparent 50%)
        `,
        'wood-grain-dark': `
          linear-gradient(90deg, rgba(212,175,55,0.03) 50%, transparent 50%),
          linear-gradient(rgba(212,175,55,0.02) 50%, transparent 50%)
        `,
      },
      backgroundSize: {
        'wood': '20px 20px, 20px 20px',
      },
    },
  },
  plugins: [],
};