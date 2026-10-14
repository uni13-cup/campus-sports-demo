<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 顶部导航（四个主 Tab：趣味玩法 / 跑步 / 发现 / 我的）
const route = useRoute()
const router = useRouter()

const tabs = [
  { to: '/play', label: '趣味玩法' },
  { to: '/run', label: '跑步', hot: true },
  { to: '/discover', label: '发现' },
  { to: '/profile', label: '我的' }
]

// 主页面之外算详情页，顶部补一个返回
const showBack = computed(() => route.meta?.tab !== true)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/play')
}
</script>

<template>
  <header class="app-nav">
    <div class="nav-inner">
      <div class="nav-top">
        <button v-if="showBack" class="back-btn" @click="goBack">‹ 返回</button>
        <router-link to="/play" class="brand">
          <span class="brand-mark"></span>
          <span class="brand-name">趣跑校园</span>
        </router-link>
        <span class="nav-note">校园跑 · 真实性核验</span>
      </div>
      <nav class="nav-tabs">
        <router-link
          v-for="t in tabs"
          :key="t.to"
          :to="t.to"
          class="nav-tab"
          :class="{ hot: t.hot }"
          active-class="active"
        >{{ t.label }}</router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-nav {
  position: sticky;
  top: 0;
  z-index: 120;
  padding-top: env(safe-area-inset-top);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--color-border);
}
.nav-inner {
  max-width: 520px;
  margin: 0 auto;
  padding: 10px 16px 0;
}
.nav-top {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
}
.back-btn {
  border: none;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 7px;
}
.brand-mark {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(135deg, #17c9ae, var(--color-primary-dark));
}
.brand-name {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--color-text);
}
.nav-note {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-text-light);
}
.nav-tabs {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-bottom: 12px;
}
.nav-tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 999px;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--color-text-light);
  white-space: nowrap;
  transition: all 0.18s;
}
.nav-tab.hot {
  color: var(--color-primary);
}
.nav-tab.active {
  background: var(--color-primary);
  color: #fff;
}
@media (min-width: 768px) {
  .nav-inner {
    padding: 12px 24px 0;
  }
}
</style>
