/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdf9ed',
          100: '#f9f0d0',
          200: '#f2de9d',
          300: '#e9c768',
          400: '#e0b042',
          500: '#C9A84C',
          600: '#b08d37',
          700: '#8a6c2a',
          800: '#6e5425',
          900: '#5a4421',
        },
        dark: {
          50: '#f5f5f7',
          100: '#e0e0e8',
          200: '#b8b8c8',
          300: '#8a8aa0',
          400: '#5c5c78',
          500: '#3a3a55',
          600: '#252538',
          700: '#1a1a2e',
          800: '#131325',
          900: '#0D0F14',
          950: '#080a0f',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #e0b042 50%, #C9A84C 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0D0F14 0%, #131325 100%)',
        'card-gradient': 'linear-gradient(145deg, #1a1a2e 0%, #131325 100%)',
      },
      boxShadow: {
        gold: '0 0 20px rgba(201, 168, 76, 0.15)',
        'gold-lg': '0 0 40px rgba(201, 168, 76, 0.25)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 168, 76, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(201, 168, 76, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
