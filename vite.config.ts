import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    watch: {
      // Windows native FS events miss changes in non-component .ts files;
      // polling catches everything reliably.
      usePolling: true,
      interval: 300,
    },
  },
})
