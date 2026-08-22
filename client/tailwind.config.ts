import type { Config } from 'tailwindcss';

/**
 * Dayflow design tokens — §8.1 Visual Language (Enhanced Modern SaaS Edition).
 * Enforces the premium visual language across every screen:
 * - Ambient glassmorphism, refined jewel-tone teal palette, slate ink
 * - Display + body font pairing (DM Serif Display + Plus Jakarta Sans / Manrope)
 * - 4/8px spacing rhythm
 * - Elevation system with layered glow and surface shadows
 * - Dynamic gradient tokens for accents, cards, and glowing pills
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D9488',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          dark: '#0B4F4A',
          light: '#2DD4BF',
        },
        ink: {
          DEFAULT: '#0F172A',
          light: '#334155',
          muted: '#64748B',
          faint: '#94A3B8',
        },
        background: '#F8FAFC',
        surface: '#FFFFFF',
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#D97706',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark: '#DC2626',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
          dark: '#2563EB',
        },
        muted: '#94A3B8',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Manrope', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      boxShadow: {
        'surface-0': '0 0 0 1px rgb(15 23 42 / 0.04)',
        'surface-1': '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 10px 25px -5px rgb(15 23 42 / 0.04)',
        'surface-2': '0 4px 16px -2px rgb(15 23 42 / 0.08), 0 20px 35px -10px rgb(15 23 42 / 0.06)',
        'surface-3': '0 10px 30px -5px rgb(15 23 42 / 0.12), 0 30px 60px -15px rgb(15 23 42 / 0.10)',
        'glass-glow': '0 0 25px -5px rgba(20, 184, 166, 0.2), 0 8px 24px -6px rgba(15, 23, 42, 0.06)',
        'primary-glow': '0 8px 25px -5px rgba(13, 148, 136, 0.35)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0F766E 0%, #0D9488 50%, #14B8A6 100%)',
        'gradient-primary-vibrant': 'linear-gradient(135deg, #0D9488 0%, #2DD4BF 100%)',
        'gradient-surface': 'linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.88) 100%)',
        'gradient-card': 'linear-gradient(160deg, rgba(255, 255, 255, 0.98) 0%, rgba(241, 245, 249, 0.6) 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.6) 100%)',
        'gradient-mesh': 'radial-gradient(at 0% 0%, rgba(20, 184, 166, 0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.08) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(240, 253, 250, 0.5) 0px, transparent 100%)',
        'gradient-auth': 'radial-gradient(circle at 85% 15%, rgba(45, 212, 191, 0.18), transparent 50%), radial-gradient(circle at 15% 85%, rgba(15, 118, 110, 0.12), transparent 50%), radial-gradient(circle at 50% 50%, rgba(248, 250, 252, 0.9), #F8FAFC)',
        'gradient-glow': 'radial-gradient(circle, rgba(45, 212, 191, 0.15), transparent 70%)',
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
