import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// summary 端点没有 CORS 放行，浏览器访问需经本地代理转发；
// 打包成桌面应用（Electron/Tauri）时可直连，无此问题
const aoe4Proxy = {
  '/aoe4world': {
    target: 'https://aoe4world.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/aoe4world/, ''),
  },
}

export default defineConfig({
  // 相对路径，方便以后打包进 Electron/Tauri 或任意子路径部署
  base: './',
  plugins: [vue()],
  server: { proxy: aoe4Proxy },
  preview: { proxy: aoe4Proxy },
})
