import { createRouter, createWebHistory } from 'vue-router'

/**
 * 路由表
 * - 负责人标注见各组件目录说明
 * - 新增路由请与李金燚统一确认后再注册
 */
const routes = [
  // 默认进趣味玩法页
  { path: '/', redirect: '/play' },
  // —— 四个主 Tab ——
  {
    path: '/play',
    name: 'play',
    component: () => import('@/views/play/PlayView.vue'),
    meta: { title: '趣味玩法', tab: true }
  },
  {
    path: '/run',
    name: 'run',
    component: () => import('@/views/exercise/ExerciseView.vue'),
    meta: { title: '跑步', tab: true }
  },
  {
    path: '/discover',
    name: 'discover',
    component: () => import('@/views/discover/DiscoverView.vue'),
    meta: { title: '发现', tab: true }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/profile/ProfileView.vue'),
    meta: { title: '我的', tab: true }
  },
  // 旧首页（李浩阳），可从详情页返回
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/home/HomeView.vue'),
    meta: { title: '校园运动平台' }
  },
  // —— 校园猫鼠大作战 v2（仅保留对战页，入口在趣味玩法） ——
  {
    path: '/game/play',
    name: 'game-play',
    component: () => import('@/views/game/GameMapView.vue'),
    meta: { title: '猫鼠大作战 · 对战' }
  },
  // —— 四个轻量功能展示页 ——
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
  // —— 真实跑步与防作弊核验 ——
  {
    path: '/verify',
    name: 'verify',
    component: () => import('@/views/verify/VerifyView.vue'),
    meta: { title: '真实跑步 · 防作弊核验' }
  },
  // 404 兜底
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
