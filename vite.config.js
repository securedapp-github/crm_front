import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      ...(isDev && {
        hmr: {
          protocol: 'ws',
          host: 'localhost',
          path: '/ws'
        }
      }),
      proxy: {
        '/local-api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        }
      }
    }
  }
})
