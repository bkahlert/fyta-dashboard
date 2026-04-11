// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          target: 'https://web.fyta.de',
          changeOrigin: true,
          secure: true,
        },
        '/img-proxy': {
          target: 'https://api.prod.fyta-app.de',
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(/^\/img-proxy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_API_TOKEN}`)
            })
          },
        },
      },
    },
  }
})
