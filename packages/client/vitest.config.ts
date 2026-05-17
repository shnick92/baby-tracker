import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@tracker/shared': resolve(__dirname, '../shared/src/index.ts'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@components': resolve(__dirname, 'src/components'),
      '@features': resolve(__dirname, 'src/features'),
      '@test': resolve(__dirname, 'src/test'),
    },
  },
})
