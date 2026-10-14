import { createRouter, createWebHistory } from 'vue-router'

/**
 * 路由表（当前为空）
 * - 新增页面请先与李金燚确认路径约定后再注册路由
 */
const routes = []

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
