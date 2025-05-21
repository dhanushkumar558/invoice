import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/invoice-ui/', // 🔥 MUST match your Nginx path
  plugins: [react()]
})
