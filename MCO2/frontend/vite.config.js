import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Required for Docker to map the port to your machine
    port: 5173, 
    proxy: {
      '/api': {
        // FIX: Use Docker service name 'backend' instead of 'localhost'
        target: 'http://backend:5001', 
        changeOrigin: true,
        secure: false,
      },
    },
  },
})