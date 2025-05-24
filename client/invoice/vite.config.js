import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/invoice/', // 🔥 MUST match your Nginx path
  plugins: [react()]
})
