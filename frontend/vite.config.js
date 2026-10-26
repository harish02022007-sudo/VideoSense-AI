import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: 'C:/Users/Harish/.vite_cache_videosense',
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'lucide-react',
      'framer-motion',
      'recharts'
    ]
  },
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    emptyOutDir: false
  }
})
