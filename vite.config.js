import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/pepite/' : '/',
  server: {
    proxy: {

      '/api-ft': {
        target: 'https://api.francetravail.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-ft/, '')
      },
      '/auth-ft': {
        target: 'https://entreprise.francetravail.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-ft/, '')
      },
      '/api-wttj': {
        target: 'https://www.welcometothejungle.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-wttj/, '')
      },
      '/api-algolia': {
        target: 'https://CSEKHVMS53-dsn.algolia.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-algolia/, ''),
        headers: {
          'Origin': 'https://www.welcometothejungle.com',
          'Referer': 'https://www.welcometothejungle.com/'
        }
      }
    }
  }
}))
