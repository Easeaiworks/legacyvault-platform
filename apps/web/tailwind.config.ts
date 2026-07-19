import type { Config } from 'tailwindcss';

// LegacyVault design tokens — refresh v2.
//
// Palette rationale (see docs/estate-guidance-module-spec.md §13):
//   Paper cream backgrounds instead of clinical white — the category (Trust & Will,
//   Everplans, FreeWill) all uses warm neutrals; pure white reads as "tech product."
//   Deep navy retained as primary — distinctive vs. category which trends toward
//   greens or terracottas. Muted gold as the accent — feels premium and considered.
//   Sage for calm/success signals; terracotta for warnings without shouting.
//
// Compatibility: keeps the same shade names (ink 50/100/…/900, navy 50/…/900,
// accent 500/700) so existing component classes remain valid; the values shift
// warm.
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paper — the primary background family (warmer than pure white)
        paper: {
          DEFAULT: '#F5F4F0',
          warm: '#ECE8DC',
        },

        // Ink — neutral text + surfaces, warm-shifted
        ink: {
          50:  '#FAF9F5',
          100: '#EFECE2',
          200: '#E0DCD0',
          300: '#C8C3B3',
          500: '#7A746A',
          700: '#443F37',
          900: '#1A1814',
        },

        // Navy — primary CTAs, headings, authority signals
        navy: {
          50:  '#F1F4F8',
          100: '#C9D3E0',
          300: '#7A94B4',
          500: '#35577E',
          700: '#1E3A5F',
          800: '#142B48',
          900: '#0D1E33',
        },

        // Accent — the gold. Amber-warm, considered.
        accent: {
          100: '#F3E8C4',
          300: '#E3C669',
          500: '#C9962B',
          700: '#A67918',
        },

        // Sage — calm success signals + WITH-column emphasis
        sage: {
          100: '#D9E5D3',
          300: '#A9C1A2',
          500: '#7A9673',
          700: '#4D6647',
        },

        // Terracotta — warm warnings + WITHOUT-column emphasis
        terracotta: {
          100: '#F2D7CD',
          300: '#D68A78',
          500: '#B85742',
          700: '#8E4032',
        },
      },
      fontFamily: {
        // Fraunces — warm humanist serif with an optical-size axis.
        // Loaded via next/font/google in layout.tsx as --font-serif.
        serif: ['var(--font-serif)', 'Fraunces', 'Georgia', 'serif'],
        // Inter — clean sans for UI + body. Loaded as --font-sans.
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Soft "considered" shadows — warmth, not tech-drop
        soft: '0 20px 50px -30px rgba(13, 30, 51, 0.15)',
        raised: '0 30px 80px -30px rgba(13, 30, 51, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
