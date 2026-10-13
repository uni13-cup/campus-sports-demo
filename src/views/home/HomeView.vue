<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const modules = [
  { name: '运动搭子墙', desc: '寻找校园运动伙伴', icon: '👥', path: '/features/sports-wall', featured: false },
  { name: '校园猫鼠大作战', desc: '模拟追逃 · 真实判定', icon: '🐱', path: '/game', featured: true },
  { name: '能量消费联盟', desc: '运动积分与兑换', icon: '⚡', path: '/features/energy-league', featured: false },
  { name: '校园地标主题探索跑', desc: '打卡校园地标', icon: '🗺️', path: '/features/theme-run', featured: false },
  { name: 'AI角色智能陪跑', desc: '虚拟陪练伙伴', icon: '🤖', path: '/features/ai-pacer', featured: false }
]

function go(path) {
  router.push(path)
}
</script>

<template>
  <div class="page home">
    <header class="hero">
      <h1 class="hero-title">校园运动平台</h1>
      <p class="hero-sub">让运动更有趣 · Demo 版</p>
    </header>

    <section class="modules">
      <h2 class="section-title">五大创新模块</h2>
      <div class="grid">
        <div
          v-for="m in modules"
          :key="m.path"
          class="card"
          :class="{ featured: m.featured }"
          @click="go(m.path)"
        >
          <span class="card-icon">{{ m.icon }}</span>
          <div class="card-body">
            <span class="card-name">{{ m.name }}</span>
            <span class="card-desc">{{ m.desc }}</span>
          </div>
          <span class="card-arrow">›</span>
        </div>
      </div>
    </section>

    <footer class="footer">
      <p>概念原型 Demo · 非已上线服务</p>
    </footer>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 32px 0 28px;
}
.hero-title {
  font-size: 28px;
  color: var(--color-primary);
}
.hero-sub {
  font-size: 14px;
  color: var(--color-text-light);
  margin-top: 4px;
}
.section-title {
  font-size: 16px;
  color: var(--color-accent);
  margin-bottom: 16px;
}
.grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--color-white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
  cursor: pointer;
  transition: transform 0.15s;
}
.card:hover {
  transform: translateY(-2px);
}
.card.featured {
  background: var(--color-primary);
}
.card.featured .card-name,
.card.featured .card-desc,
.card.featured .card-arrow {
  color: #fff;
}
.card-icon {
  font-size: 28px;
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.card-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}
.card-desc {
  font-size: 13px;
  color: var(--color-text-light);
}
.card-arrow {
  font-size: 22px;
  color: var(--color-text-light);
}
.footer {
  text-align: center;
  margin-top: 32px;
  font-size: 12px;
  color: var(--color-text-light);
}
</style>
