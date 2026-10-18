import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  if (command === 'build' && env.VITE_CONTENT_SOURCE === 'http'
    && !env.VITE_CONTENT_API_URL?.startsWith('https://')) {
    throw new Error('HTTP production builds need VITE_CONTENT_API_URL=https://<worker-domain>/api. Set VITE_CONTENT_SOURCE=local for an offline preview.')
  }
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } },
    },
  }
})
