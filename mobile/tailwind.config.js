/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Match webapp's baucis-green palette
        primary: {
          50: '#f7f8f6',
          100: '#eef1ea',
          200: '#dde3d5',
          300: '#c5d0b8',
          400: '#a8b896',
          500: '#7ca163',
          600: '#6a8a55',
          700: '#5a7448',
          800: '#4a5e3b',
          900: '#3e4e32',
        },
        // Match webapp's baucis-pink palette
        accent: {
          50: '#fefcfc',
          100: '#fdf8f8',
          200: '#fbf0f0',
          300: '#f7e4e4',
          400: '#f2d3d3',
          500: '#f7d1d1',
          600: '#e5b8b8',
          700: '#d19f9f',
          800: '#bd8686',
          900: '#a96d6d',
        },
        // Zen tier colors - match webapp styling
        zen: {
          seed: '#a8a29e',      // stone-400
          sprout: '#10b981',    // emerald-500
          blossom: '#ec4899',   // pink-500
          lotus: '#f59e0b',     // amber-500
        },
      },
    },
  },
  plugins: [],
};
