import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  build: {
    // Otimizações para reduzir uso de memória
    sourcemap: process.env.VITE_DISABLE_SOURCEMAPS !== 'true',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs em produção
      },
    },
    rollupOptions: {
      output: {
        // Reduz tamanho dos chunks
        manualChunks: {
          vendor: ['react', 'react-dom'],
          wagmi: ['@wagmi/core', '@wagmi/connectors', 'wagmi', 'viem'],
          fuel: ['fuels', '@fuels/react', '@fuels/connectors'],
        },
      },
    },
    // Reduz uso de memória durante build
    chunkSizeWarningLimit: 1000,
  },
});
