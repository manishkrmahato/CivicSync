/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#F2F7F4',
          100: '#E1EFE7',
          200: '#C2DFD0',
          300: '#94C6AE',
          400: '#5EA787',
          500: '#388866',
          600: '#2D6A4F',
          700: '#1B4332',
          800: '#143326',
          900: '#081C15',
        },
        civic: {
          canvas: '#FBFBFA',
          surface: '#FFFFFF',
          subtle: '#F5F5F3',
          border: '#E7E5E4',
          muted: '#78716C',
          dark: '#1C1917',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Newsreader', 'Playfair Display', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

