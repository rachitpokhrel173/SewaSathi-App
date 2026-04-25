import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/SewaSathi-App/',
  plugins: [react()],
})