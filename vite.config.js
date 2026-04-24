import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const FSQ_KEY = env.FOURSQUARE_API_KEY || env.VITE_FOURSQUARE_API_KEY
  const FSQ_VERSION = '2025-06-17'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/fsq': {
          target: 'https://places-api.foursquare.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/fsq/, '/places'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (FSQ_KEY) {
                proxyReq.setHeader('Authorization', `Bearer ${FSQ_KEY}`)
              }
              proxyReq.setHeader('X-Places-Api-Version', FSQ_VERSION)
              proxyReq.setHeader('Accept', 'application/json')
            })
          },
        },
      },
    },
  }
})
