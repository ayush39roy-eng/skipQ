import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#00C48C', // Neo Mint Green
          secondary: '#00E0A1',
          accent: '#D9FFF1', // Soft Tint
        },
        game: {
          bg: '#FFF8F0', // Cream (Requested)
          primary: '#FF9F1C', // Vibrant Orange (Requested)
          secondary: '#FFD166', // Mustard Yellow
          tertiary: '#06D6A0', // Mint Green
          ink: '#000000', // Pure Black
          surface: '#FFFFFF', // White for cards
        },
        // Vendor colors could be re-added if needed, but keeping it focused on what broke
        vendor: {
           bg: '#F7F9FB',
           sidebar: '#F1F4F8',
           surface: '#FFFFFF',
           border: '#E5E7EB',
           divider: '#EDF2F7',
           text: {
             primary: '#111827',
             secondary: '#6B7280',
             muted: '#9CA3AF',
           },
           accent: {
             DEFAULT: '#00C48C',
             soft: '#D9FFF1',
           },
           success: '#00C48C',
           danger: '#EF476F',
        }
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo': '4px 4px 0px 0px #000000',
        'neo-lg': '6px 6px 0px 0px #000000',
        'neo-xl': '8px 8px 0px 0px #000000',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        }
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        wiggle: 'wiggle 1s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
} satisfies Config
