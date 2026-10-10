import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Shared assets live above this project; resolve their packages from its own installation.
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue'] },
})
