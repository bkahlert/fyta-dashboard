import type { ClientRequest } from 'node:http'

// @tailwindcss/vite ESM-imports .css files (e.g. daisyui.css) during build,
// which crashes rolldown's Node worker (no CSS loader in that context).
// This is not fixable via Vite config — Vite 8 has no rolldown opt-out.
// Use @tailwindcss/postcss instead; it processes CSS in the main process.
// Track: https://github.com/tailwindlabs/tailwindcss/issues/19719
import tailwindcss from '@tailwindcss/postcss'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const authHeader = (proxyReq: ClientRequest) => {
    proxyReq.setHeader('Authorization', `Bearer ${env.FYTA_API_TOKEN ?? ''}`)
  }

  return {
    plugins: [vue()],
    css: { postcss: { plugins: [tailwindcss()] } },
    server: {
      proxy: {
        '/api': {
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', authHeader)
          },
          secure: true,
          target: 'https://web.fyta.de',
        },
        '/img-proxy': {
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', authHeader)
          },
          rewrite: (path) => path.replace(/^\/img-proxy/, ''),
          secure: true,
          target: 'https://api.prod.fyta-app.de',
        },
      },
    },
  }
})
