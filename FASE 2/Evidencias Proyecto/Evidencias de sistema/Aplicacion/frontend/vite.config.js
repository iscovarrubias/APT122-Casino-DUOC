import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/preparar.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/pruebas/**', 'src/main.jsx'],
      reporter: ['text-summary', 'text', 'html'],
      thresholds: { lines: 90, statements: 88, functions: 85, branches: 80 },
    },
  },
})
