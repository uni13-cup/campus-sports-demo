<script setup>
// 底部五 Tab 导航（参考校园跑 App：中央凸起的运动圆钮）
const tabs = [
  { to: '/courses', icon: '📚', label: '课程' },
  { to: '/schedule', icon: '📅', label: '日程' },
  { to: '/exercise', icon: '🏃', label: '运动', center: true },
  { to: '/discover', icon: '🧭', label: '发现' },
  { to: '/profile', icon: '👤', label: '我的' }
]
</script>

<template>
  <nav class="tab-bar">
    <router-link
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      class="tab"
      :class="{ center: t.center }"
      active-class="active"
    >
      <span v-if="t.center" class="center-circle">{{ t.icon }}</span>
      <span v-else class="icon">{{ t.icon }}</span>
      <span class="label">{{ t.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--color-white);
  box-shadow: 0 -2px 16px rgba(23, 35, 61, 0.08);
  max-width: 520px;
  margin: 0 auto;
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--color-text-light);
  font-size: 11px;
}
.tab .icon {
  font-size: 20px;
  line-height: 1;
  filter: grayscale(1);
  opacity: 0.6;
  transition: all 0.2s;
}
.tab.active {
  color: var(--color-primary);
  font-weight: 600;
}
.tab.active .icon {
  filter: none;
  opacity: 1;
}
.center-circle {
  width: 48px;
  height: 48px;
  margin-top: -26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4d86ff, var(--color-primary-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 6px 16px rgba(46, 107, 255, 0.4);
  border: 3px solid var(--color-white);
}
.tab.center.active .center-circle {
  transform: scale(1.06);
}
</style>
