import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  // --- ADD THIS BLOCK ---
  server: {
    proxy: {
      // Any request starting with '/api'
      '/api': {
        // Will be redirected to your backend server
        target: 'http://localhost:5001',
        changeOrigin: true, // Needed for virtual hosted sites
        secure: false,      // If your backend is not HTTPS
      },
    },
  },
  // --- END OF BLOCK ---
})