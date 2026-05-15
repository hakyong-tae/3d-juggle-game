import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3021,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  preview: {
    port: 3021,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 5000,
  },
  assetsInclude: ['**/*.mp3', '**/*.glb'],
})
