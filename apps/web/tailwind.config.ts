import type { Config } from 'tailwindcss';

// Brand palette — reserved, trustworthy, slightly warm.
// Deep navy + aged parchment + muted gold accent.
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  '#F6F5F2',
          100: '#EDEBE3',
          200: '#D9D6C6',
          300: '#B9B4A0',
          500: '#5C5846',
          700: '#2F2D25',
          900: '#141310',
        },
        navy: {
          50:  '#F1F4F8',
          100: '#DCE3EE',
          300: '#95A7C0',
          500: '#3E5576',
          700: '#263C5B',
          900: '#122038',
        },
        accent: {
          500: '#B8874B', // muted gold
          700: '#8A6432',
        },
      },
      fontFamily: {
        serif: ['Source Serif Pro', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
