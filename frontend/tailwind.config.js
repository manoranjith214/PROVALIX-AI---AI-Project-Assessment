/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          dark: '#6D28D9',
          light: '#A78BFA',
          hover: '#6D28D9',
        },
        brand: {
          slate: '#CBD5E1',
          dark: '#F8FAFC',
          muted: '#94A3B8',
          bg: '#0B1120',
          border: '#243047',
          surface: '#111827',
          card: '#111827',
          cardHover: '#172033',
        },
        amber: {
          DEFAULT: '#F59E0B',
          light: 'rgba(245, 158, 11, 0.15)',
        },
        ai: {
          purple: '#7C3AED',
          light: '#A78BFA',
          dark: '#5B21B6',
        },
        success: {
          DEFAULT: '#22C55E',
          light: 'rgba(34, 197, 94, 0.15)',
        },
        error: {
          DEFAULT: '#EF4444',
          light: 'rgba(239, 68, 68, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
        dropdown: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        saas: '16px',
      }
    },
  },
  plugins: [],
}
