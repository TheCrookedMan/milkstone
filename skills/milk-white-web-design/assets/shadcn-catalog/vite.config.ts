import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins:[vue(), tailwindcss()],
  resolve:{ alias:{ '@':new URL('./src', import.meta.url).pathname } },
  server:{host:'127.0.0.1',proxy:{'/api/hairline':'http://127.0.0.1:4341'}},
  preview:{host:'127.0.0.1',proxy:{'/api/hairline':'http://127.0.0.1:4341'}}
})
