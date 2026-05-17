import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          green: '#22c55e',
          amber: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
