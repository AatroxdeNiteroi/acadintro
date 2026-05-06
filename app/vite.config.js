import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY || '';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true, // bind to 0.0.0.0 — needed for tunnels and LAN
      allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.loca.lt', 'localhost'],
      proxy: {
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (ANTHROPIC_KEY) proxyReq.setHeader('x-api-key', ANTHROPIC_KEY);
              proxyReq.setHeader('anthropic-version', '2023-06-01');
            });
          },
        },
      },
    },
    define: {
      __HAS_ANTHROPIC_KEY__: JSON.stringify(Boolean(ANTHROPIC_KEY)),
    },
  };
});
