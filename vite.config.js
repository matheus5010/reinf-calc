import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['xlsx'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
