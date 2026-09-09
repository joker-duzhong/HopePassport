import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/passport/',
  plugins: [vue()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
