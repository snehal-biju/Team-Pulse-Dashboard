import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // dev server proxies API calls to FastAPI so the frontend uses
      // relative /api URLs in both dev and production
      '/api': 'http://localhost:8000',
    },
  },
})
