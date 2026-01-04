/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // BAUCIS ZEN Color Palette - Only two colors
        'baucis-green': {
          50: '#f7f8f6',
          100: '#eef1ea',
          200: '#dde3d5',
          300: '#c5d0b8',
          400: '#a8b896',
          500: '#7ca163', // Main green color
          600: '#6a8a55',
          700: '#5a7448',
          800: '#4a5e3b',
          900: '#3e4e32',
        },
        'baucis-pink': {
          50: '#fefcfc',
          100: '#fdf8f8',
          200: '#fbf0f0',
          300: '#f7e4e4',
          400: '#f2d3d3',
          500: '#f7d1d1', // Main pink color
          600: '#e5b8b8',
          700: '#d19f9f',
          800: '#bd8686',
          900: '#a96d6d',
        },
        // Keep some basic grays for text and borders
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      animation: {
        'matcha-float': 'matchaFloat 6s ease-in-out infinite',
        'matcha-glow': 'matchaGlow 2s ease-in-out infinite alternate',
        'matcha-pulse': 'matchaPulse 3s ease-in-out infinite',
        'matcha-sparkle': 'matchaSparkle 1.5s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-fast': 'float 4s ease-in-out infinite',
        'zen-float': 'zenFloat 10s ease-in-out infinite',
        'shimmer': 'shimmer 3s infinite',
        'mascot-float': 'mascotFloat 3s ease-in-out infinite',
        'wave': 'wave 0.5s ease-in-out infinite',
      },
      keyframes: {
        matchaFloat: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '25%': { transform: 'translateY(-8px) translateX(3px)' },
          '50%': { transform: 'translateY(-15px) translateX(0px)' },
          '75%': { transform: 'translateY(-8px) translateX(-3px)' },
        },
        matchaGlow: {
          '0%': { 
            boxShadow: '0 0 20px rgba(58, 157, 58, 0.2), 0 0 40px rgba(58, 157, 58, 0.1)',
            transform: 'scale(1)'
          },
          '100%': { 
            boxShadow: '0 0 30px rgba(58, 157, 58, 0.3), 0 0 60px rgba(58, 157, 58, 0.15)',
            transform: 'scale(1.01)'
          },
        },
        matchaPulse: {
          '0%, 100%': { 
            opacity: '0.7',
            transform: 'scale(1)'
          },
          '50%': { 
            opacity: '1',
            transform: 'scale(1.03)'
          },
        },
        matchaSparkle: {
          '0%, 100%': { 
            opacity: '0.5',
            transform: 'rotate(0deg) scale(1)'
          },
          '50%': { 
            opacity: '0.9',
            transform: 'rotate(90deg) scale(1.05)'
          },
        },
        zenFloat: {
          '0%, 100%': { 
            transform: 'translateY(0px) rotate(0deg)',
            opacity: '0.6'
          },
          '50%': { 
            transform: 'translateY(-12px) rotate(2deg)',
            opacity: '0.8'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        mascotFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wave: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(20deg)' },
          '75%': { transform: 'rotate(-10deg)' },
        },
      },
    },
  },
  plugins: [],
}
