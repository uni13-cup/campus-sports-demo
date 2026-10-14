<script setup>
import { useRouter } from 'vue-router'

// 趣味玩法页：游戏 + 积分商城 + AI 陪跑
// 负责人：李金燚
const router = useRouter()

const games = [
  { name: '猫鼠大作战', desc: '真人版猫追鼠，跑起来才不会被抓', icon: '🐱', path: '/game/play', badge: 'v2' },
  { name: '撕名牌', desc: '组队对抗，撕掉对方名牌获胜', icon: '🏷️', path: null, badge: '敬请期待' },
  { name: '躲避球', desc: '团队协作，灵活闪避', icon: '⚽', path: null, badge: '敬请期待' }
]

const shops = [
  { name: '能量消费联盟', desc: '跑步攒能量，校园里花出去', icon: '⚡', path: '/features/energy-league' }
]

const ai = [
  { name: 'AI 角色智能陪跑', desc: '跑步时有人说话，比一个人戴耳机强', icon: '🤖', path: '/features/ai-pacer' }
]

function go(path) {
  if (path) router.push(path)
}
</script>

<template>
  <div class="page play">
    <section class="hero">
      <h1>趣味玩法</h1>
      <p>跑步不只是绕圈，也可以是一场游戏。</p>
    </section>

    <!-- 游戏区 -->
    <section class="block">
      <h2 class="block-title">🎮 游戏</h2>
      <div class="cards">
        <div
          v-for="g in games"
          :key="g.name"
          class="card"
          :class="{ disabled: !g.path }"
          @click="go(g.path)"
        >
          <span class="card-icon">{{ g.icon }}</span>
          <div class="card-body">
            <span class="card-name">{{ g.name }}</span>
            <span class="card-desc">{{ g.desc }}</span>
          </div>
          <span class="card-badge" :class="{ soon: !g.path }">{{ g.badge }}</span>
        </div>
      </div>
    </section>

    <!-- 积分商城 -->
    <section class="block">
      <h2 class="block-title">🛒 积分商城</h2>
      <div class="cards">
        <div
          v-for="s in shops"
          :key="s.name"
          class="card"
          @click="go(s.path)"
        >
          <span class="card-icon">{{ s.icon }}</span>
          <div class="card-body">
            <span class="card-name">{{ s.name }}</span>
            <span class="card-desc">{{ s.desc }}</span>
          </div>
          <span class="card-arrow">›</span>
        </div>
      </div>
    </section>

    <!-- AI 陪跑 -->
    <section class="block">
      <h2 class="block-title">🤖 AI 陪跑</h2>
      <div class="cards">
        <div
          v-for="a in ai"
          :key="a.name"
          class="card"
          @click="go(a.path)"
        >
          <span class="card-icon">{{ a.icon }}</span>
          <div class="card-body">
            <span class="card-name">{{ a.name }}</span>
            <span class="card-desc">{{ a.desc }}</span>
          </div>
          <span class="card-arrow">›</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.play {
  padding: 16px;
  max-width: 520px;
  margin: 0 auto;
}
.hero h1 {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 6px;
}
.hero p {
  margin: 0 0 20px;
  color: var(--color-text-light);
  font-size: 14px;
}
.block {
  margin-bottom: 24px;
}
.block-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--color-text);
}
.cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.card.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.card-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.card-body {
  flex: 1;
  min-width: 0;
}
.card-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}
.card-desc {
  display: block;
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 2px;
}
.card-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}
.card-badge.soon {
  background: var(--color-text-light);
}
.card-arrow {
  font-size: 22px;
  color: var(--color-text-light);
  flex-shrink: 0;
}
</style>
