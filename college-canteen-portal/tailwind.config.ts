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
        // ...vendor colors...
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo': '4px 4px 0px 0px #000000',
        'neo-lg': '6px 6px 0px 0px #000000',
        'neo-xl': '8px 8px 0px 0px #000000',
      }
    },
  },
  plugins: [],
} satisfies Config
