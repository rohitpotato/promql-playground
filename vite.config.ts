import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy requests to PromLabs demo Prometheus server
      // Source: https://github.com/prometheus/promlens uses this as default
      '/prometheus': {
        target: 'https://demo.promlabs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/prometheus/, ''),
        secure: true,
      },
    },
  },
})
