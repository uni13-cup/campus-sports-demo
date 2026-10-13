import { createRouter, createWebHistory } from 'vue-router'

/**
 * 路由表
 * - 负责人标注见各组件目录说明
 * - 新增路由请与李金燚统一确认后再注册
 */
const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/HomeView.vue'),
    meta: { title: '校园运动平台' }
  },
  // —— 校园猫鼠大作战（李金燚负责） ——
  {
    path: '/game',
    name: 'game-lobby',
    component: () => import('@/views/game/GameLobbyView.vue'),
    meta: { title: '猫鼠大作战 · 大厅' }
  },
  {
    path: '/game/play',
    name: 'game-play',
    component: () => import('@/views/game/GameMapView.vue'),
    meta: { title: '猫鼠大作战 · 对战' }
  },
  {
    path: '/game/result',
    name: 'game-result',
    component: () => import('@/views/game/GameResultView.vue'),
    meta: { title: '猫鼠大作战 · 结算' }
  },
  // —— 四个轻量功能展示页（李浩阳负责） ——
  {
    path: '/features/sports-wall',
    name: 'sports-wall',
    component: () => import('@/views/features/SportsWallView.vue'),
    meta: { title: '运动搭子墙' }
  },
  {
    path: '/features/energy-league',
    name: 'energy-league',
    component: () => import('@/views/features/EnergyLeagueView.vue'),
    meta: { title: '能量消费联盟' }
  },
  {
    path: '/features/theme-run',
    name: 'theme-run',
    component: () => import('@/views/features/ThemeRunView.vue'),
    meta: { title: '校园地标主题探索跑' }
  },
  {
    path: '/features/ai-pacer',
    name: 'ai-pacer',
    component: () => import('@/views/features/AIPacerView.vue'),
    meta: { title: 'AI角色智能陪跑' }
  },
  // 404 兜底
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} | 校园运动平台`
  }
})

export default router
