import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
// GitHub Pages 项目页部署在 /campus-sports-demo/ 子路径下，仅在构建时生效；本地 dev 仍走根路径
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/campus-sports-demo/' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    port: 5173
  }
})
