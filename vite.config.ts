import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Deployed to Vercel at the domain root, so no `base` subpath is needed.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
