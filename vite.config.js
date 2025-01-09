import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // Output directory for production build
  },
  server: {
    port: 3000, // Development server port
  },
});