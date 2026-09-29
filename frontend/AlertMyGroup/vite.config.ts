import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      host: true,
      allowedHosts: true,
      cors: true,
      proxy: {
        '/api': {
          target: env.API_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
