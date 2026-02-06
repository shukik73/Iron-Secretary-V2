import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    tailwindcss(),
    react(),
  ],
  // API keys must NEVER be injected into the client bundle.
  // Use Supabase Edge Functions or a backend proxy for AI API calls.
  // Client-side env vars use VITE_ prefix and are accessed via import.meta.env.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
