<script setup>
import { useRouter } from 'vue-router'

// 趣味玩法页：按 feature/home-features 分支李浩阳的首页设计实现
// （五大创新模块卡片）；猫鼠入口由旧大厅 /game 适配为 v2 对战页 /game/play
const router = useRouter()

const modules = [
  { name: '运动搭子墙', desc: '一个人跑不动，两个人就能出门', icon: '👥', path: '/features/sports-wall', featured: false },
  { name: '校园猫鼠大作战', desc: '真人版猫追鼠，跑起来才不会被抓', icon: '🐱', path: '/game/play', featured: true },
  { name: '能量消费联盟', desc: '跑步攒下的能量，能在校园里花出去', icon: '⚡', path: '/features/energy-league', featured: false },
  { name: '校园地标主题探索跑', desc: '把校园跑成一条路线，不再是绕圈', icon: '🗺️', path: '/features/theme-run', featured: false },
  { name: 'AI角色智能陪跑', desc: '跑步的时候有人说话，比一个人戴耳机强', icon: '🤖', path: '/features/ai-pacer', featured: false }
]

function go(path) {
  router.push(path)
}
</script>

<template>
  <div class="page play">
    <header class="brand">
      <span class="brand-logo">趣跑校园</span>
      <span class="brand-sub">让校园跑步有趣一点</span>
    </header>

    <header class="hero">
      <h1 class="hero-title">不再为里程打卡，<br />而是为乐趣出门。</h1>
      <p class="hero-sub">五种玩法，一条主线——让你愿意跑。</p>
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

    <p class="shield">
      🛡 所有玩法由低干扰核验托底：只读手机加速度传感器，不采集位置、不上传服务器。
    </p>

    <footer class="footer">
      <p>概念原型 Demo · 非已上线服务</p>
    </footer>
  </div>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-top: 4px;
}
.brand-logo {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 2px;
  color: var(--color-primary);
}
.brand-sub {
  font-size: 12px;
  color: var(--color-text-light);
}
.hero {
  text-align: center;
  padding: 24px 0 24px;
}
.hero-title {
  font-size: 24px;
  line-height: 1.45;
  font-weight: 800;
  color: var(--color-primary);
}
.hero-sub {
  font-size: 14px;
  color: var(--color-text-light);
  margin-top: 8px;
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
@media (min-width: 768px) {
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
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
.shield {
  margin-top: 24px;
  background: var(--color-white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 14px 16px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--color-text-light);
}
.footer {
  text-align: center;
  margin-top: 20px;
  font-size: 12px;
  color: var(--color-text-light);
}
</style>
