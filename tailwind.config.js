/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#080511',
          surface: '#110a22',
          card: '#160e2e',
          border: 'rgba(139, 92, 246, 0.22)',
          borderHover: 'rgba(168, 85, 247, 0.5)',
        },
        neon: {
          purple: '#8B5CF6',
          violet: '#7C3AED',
          light: '#A855F7',
          glow: '#C084FC',
          electric: '#9333EA',
          pink: '#C026D3',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#9D97B5',
          accent: '#E9D5FF',
        }
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
        'neon': '0 0 20px rgba(139, 92, 246, 0.45)',
        'neon-lg': '0 0 35px rgba(168, 85, 247, 0.55)',
        'neon-btn': '0 4px 20px rgba(124, 58, 237, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)' },
          '100%': { boxShadow: '0 0 30px rgba(168, 85, 247, 0.7)' },
        }
      }
    },
  },
  plugins: [],
}
