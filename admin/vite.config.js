import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA/offline support is scoped to the admin app only (not the customer
    // landing page). Precaches the app shell (JS/CSS/HTML/icons) so the POS
    // still loads with no connection; Convex traffic is deliberately never
    // cached here - offline data comes from IndexedDB (see src/lib/offlineDb.js),
    // not a stale HTTP/service-worker cache.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: {
        name: 'Dennan Admin',
        short_name: 'Dennan Admin',
        description: 'Dennan staff & admin portal, incl. offline walk-in POS',
        start_url: '/',
        display: 'standalone',
        background_color: '#FAF9F8',
        theme_color: '#212527',
        icons: [
          { src: '/dennan_logo_final_compressed.png', sizes: '512x512', type: 'image/png' },
          { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Never let the service worker intercept Convex's API/websocket
        // traffic - it must always hit the network (or fail fast so our
        // own online/offline + IndexedDB logic can react), never serve a
        // cached/stale response.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  envDir: path.resolve(__dirname, '..'),
  publicDir: path.resolve(__dirname, '../public'),
  resolve: {
    alias: {
      '@convex': path.resolve(__dirname, '../convex'),
    },
  },
  server: {
    port: 5174,
  },
})
