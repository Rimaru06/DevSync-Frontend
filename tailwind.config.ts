import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#137fec',
        'background-light': '#f8f9fa',
        'background-dark': '#0f0f0f',
        'foreground': {
          DEFAULT: '#111827',
          secondary: '#6b7280'
        },
        'card': '#f9fafb',
        'border': '#e5e7eb'
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
} satisfies Config