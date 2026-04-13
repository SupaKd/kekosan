import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (['react', 'react-dom', 'react-router-dom'].some(pkg => id.includes(`/node_modules/${pkg}/`))) {
              return 'vendor-react';
            }
            if (['@stripe/react-stripe-js', '@stripe/stripe-js'].some(pkg => id.includes(`/node_modules/${pkg}/`))) {
              return 'vendor-stripe';
            }
            if (id.includes('/node_modules/socket.io-client/')) {
              return 'vendor-socket';
            }
          }
        },
      },
    },
  },
})
