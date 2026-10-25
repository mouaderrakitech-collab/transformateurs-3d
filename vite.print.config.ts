import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Document imprimable (source du PDF) : construction séparée, NON publiée avec le site.
// Réutilise les contenus (diapositives, données techniques) et les schémas SVG de l'application.
export default defineConfig({
  root: path.resolve(__dirname, 'print'),
  base: './',
  plugins: [react()],
  publicDir: path.resolve(__dirname, 'print/captures'),
  build: {
    outDir: path.resolve(__dirname, 'build-print'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
  },
})
