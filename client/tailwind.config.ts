import type { Config } from 'tailwindcss';

/**
 * Dayflow design tokens — §8.1 Visual Language.
 * Enforces the premium visual language across every screen:
 * - Color palette with primary teal, ink, and semantic status colors
 * - Display + body font pairing (DM Serif Display + Manrope)
 * - 4/8px spacing rhythm
 * - Elevation system (surface-0 through surface-3)
 * - Gradient tokens for accents and surfaces
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0F766E',
        'primary-light': '#2DD4BF',
        'primary-dark': '#0D5D57',
        ink: '#1E293B',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        muted: '#94A3B8',
      },
      fontFamily: {
        display: ['DM Serif Display', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      boxShadow: {
        'surface-0': '0 0 0 1px rgb(15 23 42 / .03)',
        'surface-1': '0 1px 2px rgb(15 23 42 / .04), 0 12px 30px rgb(15 23 42 / .06)',
        'surface-2': '0 4px 12px rgb(15 23 42 / .06), 0 20px 60px rgb(15 23 42 / .10)',
        'surface-3': '0 8px 24px rgb(15 23 42 / .08), 0 32px 80px rgb(15 23 42 / .14)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0F766E, #2DD4BF)',
        'gradient-surface': 'linear-gradient(135deg, rgba(255,255,255,.98), rgba(240,253,250,.88))',
        'gradient-auth': 'radial-gradient(circle at 80% 20%, rgba(45,212,191,.15), transparent 50%), radial-gradient(circle at 20% 80%, rgba(15,118,110,.08), transparent 50%)',
        'gradient-glow': 'radial-gradient(circle, rgba(45,212,191,.12), transparent 70%)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
} satisfies Config;
