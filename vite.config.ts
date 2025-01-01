import { defineConfig, ConfigEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  // Type assertion to ensure mode is either 'development' or 'production'
  const isDevelopment = mode === 'development';

  return {
    plugins: [
      react(),
      ...(isDevelopment ? [
        VitePWA({
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          strategies: 'generateSW',
          workbox: {
            cleanupOutdatedCaches: true,
            skipWaiting: true,
            clientsClaim: true,
            sourcemap: true,
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
            globPatterns: [
              '**/*.{js,css,html}',
              '**/*.{ico,png,svg,json}'
            ],
            navigateFallback: '/index.html',
            navigateFallbackDenylist: [/^\/api\//],
            runtimeCaching: [
              {
                urlPattern: ({ request }) => request.mode === 'navigate',
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'pages',
                  networkTimeoutSeconds: 3,
                  cacheableResponse: {
                    statuses: [200]
                  }
                }
              },
              {
                urlPattern: /\.(js|css)$/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'static-resources',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 24 * 60 * 60
                  }
                }
              },
              {
                urlPattern: /\.(png|svg|ico|json)$/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'assets-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 24 * 60 * 60 * 7 // 7 days
                  }
                }
              }
            ]
          },
          manifest: {
            name: 'AI Localhost Chat',
            short_name: 'AI Chat',
            description: 'Chat with Your Local AI Using ailocalhost.com',
            theme_color: '#1a1a1a',
            icons: [
              {
                src: '/ailhlogo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/ailhlogo-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ],
            start_url: '/',
            display: 'standalone',
            background_color: '#1a1a1a'
          },
          disable: isDevelopment,
          devOptions: {
            enabled: false
          }
        })
      ] : [])
    ],
    server: {
      port: 5173,
      strictPort: true,
      watch: {
        usePolling: true
      }
    },
    build: {
      sourcemap: true,
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              'react',
              'react-dom'
            ]
          }
        }
      },
      chunkSizeWarningLimit: 1000
    }
  };
});
