
import { defineConfig } from 'vite'
import { loadEnv } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configuración de React y Tailwind CSS
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget =
    env.URL_PEDIDOS || env.VITE_API_URL || 'http://localhost:3001'
  const deliveriesApiTarget =
    env.URL_DELIVERIES || 'http://localhost:3002'

  return {
    envPrefix: ['VITE_', 'URL_PEDIDOS', 'URL_DELIVERIES'],
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
        '/deliveries-api': {
          target: deliveriesApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/deliveries-api/, ''),
        },
      },
    },
  }
})
