import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = (env.VITE_API_TARGET || env.VITE_API_URL || 'http://localhost:5000').trim();

  const handleProxyError = (err, req, res) => {
    console.warn(`[Vite Proxy Error] Could not connect to backend at ${proxyTarget}${req.url}: ${err.message}`);
    if (res && typeof res.writeHead === 'function' && !res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: `CRM Backend server is not running or unreachable at ${proxyTarget}. Please start the backend service (e.g. run start-local.bat or npm run start:backend).`,
        code: 'BACKEND_NOT_RUNNING'
      }));
    }
  };

  const createProxyConfig = () => ({
    target: proxyTarget,
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: {
      '*': ''
    },
    cookiePathRewrite: '/',
    configure: (proxy) => {
      proxy.on('error', handleProxyError);
    }
  });

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
        '/api': createProxyConfig(),
        '/local-api': createProxyConfig(),
        '/uploads': createProxyConfig()
      }
    }
  }
})
