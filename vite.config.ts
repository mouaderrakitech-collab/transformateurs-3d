import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// base './' : chemins relatifs, le dossier construit fonctionne depuis n'importe quel serveur local,
// un sous-dossier GitHub Pages ou une clé USB.
// Mode « single » : un seul fichier index.html autonome, ouvrable directement (file://) sans serveur.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: {
    chunkSizeWarningLimit: 2000,
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    copyPublicDir: mode !== 'single',
  },
  server: { port: 5173 },
}))
