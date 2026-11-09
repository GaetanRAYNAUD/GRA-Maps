import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  // Pre-bundling would move MapLibre away from its worker file (see src/maplibre-worker.ts).
  optimizeDeps: { exclude: ['maplibre-gl'] },
  // MapLibre starts its worker as an ES module.
  worker: { format: 'es' },
})
