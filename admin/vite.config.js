import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
