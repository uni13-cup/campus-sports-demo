<script setup>
// 我的页：用户信息 + 会员 + 数据概览环 + AI 洞察（对应参考视频我的页）
const rings = [
  { label: '饮食', value: '--', pct: 0 },
  { label: '训练', value: '2', pct: 0.66 },
  { label: '睡眠', value: '--', pct: 0 }
]
const R = 26
const C = 2 * Math.PI * R

const quicks = [
  { icon: '▶️', label: '我的课程', to: '/courses' },
  { icon: '🏆', label: '我的活动', to: '/discover' },
  { icon: '⚡', label: '能量联盟', to: '/features/energy-league' },
  { icon: '👛', label: '订单与钱包', to: '/profile' }
]
</script>

<template>
  <div class="page">
    <!-- 用户卡 -->
    <section class="user-card">
      <span class="avatar">🧑‍🎓</span>
      <div class="user-info">
        <h3>偶尔调皮的_CampusRunner ›</h3>
        <p>0 关注&ensp;0 粉丝&ensp;0 加油</p>
      </div>
    </section>

    <!-- 徽章行 -->
    <section class="badge-row">
      <span>🏅 K5 · 新升级</span>
      <span>🏆 27 新挑战</span>
      <span>⚡ 累计运动 128 天</span>
    </section>

    <!-- 会员卡 -->
    <section class="vip-card">
      <div class="vip-info">
        <strong>👑 CampusRun · 校园会员</strong>
        <p>体测冲刺计划 · 私教课 5 折</p>
      </div>
      <button class="vip-btn">立即开通</button>
    </section>

    <!-- 快捷入口 -->
    <section class="card quick-row">
      <router-link v-for="q in quicks" :key="q.label" :to="q.to" class="quick">
        <span class="q-icon">{{ q.icon }}</span>
        <span>{{ q.label }}</span>
      </router-link>
    </section>

    <!-- 数据概览 -->
    <div class="tabs page-tabs">
      <span class="tab-item active">今日概览</span>
      <span class="tab-item">身体能力</span>
      <span class="tab-item">全部数据</span>
    </div>
    <section class="card rings-card">
      <div v-for="r in rings" :key="r.label" class="ring-item">
        <svg viewBox="0 0 64 64" class="r-svg">
          <circle cx="32" cy="32" :r="R" fill="none" stroke="var(--color-border)" stroke-width="6" />
          <circle
            v-if="r.pct > 0"
            cx="32" cy="32" :r="R" fill="none" stroke="var(--color-primary)" stroke-width="6"
            stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - r.pct)"
            transform="rotate(-90 32 32)"
          />
          <text x="32" y="37" text-anchor="middle" class="r-text">{{ r.value }}</text>
        </svg>
        <span class="r-label">{{ r.label }}</span>
      </div>
    </section>

    <!-- AI 洞察 -->
    <router-link to="/features/ai-pacer" class="ai-card card">
      <p class="ai-title">🪄 AI 洞察</p>
      <p class="ai-text">今天有待提升，训练刺激仍可加强</p>
      <span class="ai-link">查看完整分析 ›</span>
    </router-link>

    <!-- 睡眠 -->
    <section class="card sleep-card">
      <span class="s-icon">🛏️</span>
      <div class="s-info">
        <strong>睡眠</strong>
        <p>补充昨晚的睡眠情况</p>
      </div>
      <button class="record-btn">+ 记录</button>
    </section>
  </div>
</template>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
.user-info h3 {
  font-size: 17px;
}
.user-info p {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 3px;
}
.badge-row {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text);
}
.vip-card {
  margin-top: 14px;
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #1b2a4a, #101a30);
  color: #fff;
}
.vip-info strong {
  font-size: 14px;
}
.vip-info p {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 3px;
}
.vip-btn {
  border: none;
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
}
.quick-row {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  padding: 14px 10px;
}
.quick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text);
  width: 25%;
}
.q-icon {
  font-size: 20px;
}
.page-tabs {
  margin-top: 20px;
}
.rings-card {
  margin-top: 12px;
  display: flex;
  justify-content: space-around;
  padding: 16px 10px;
}
.ring-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.r-svg {
  width: 68px;
  height: 68px;
}
.r-text {
  fill: var(--color-text);
  font-size: 14px;
  font-weight: 700;
}
.r-label {
  font-size: 12px;
  color: var(--color-text-light);
}
.ai-card {
  margin-top: 12px;
  display: block;
  color: var(--color-text);
}
.ai-title {
  font-size: 13px;
  font-weight: 700;
}
.ai-text {
  font-size: 15px;
  font-weight: 600;
  margin: 6px 0;
}
.ai-link {
  font-size: 12px;
  color: var(--color-primary);
}
.sleep-card {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.s-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.s-info {
  flex: 1;
}
.s-info strong {
  font-size: 14px;
}
.s-info p {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 2px;
}
.record-btn {
  border: none;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 999px;
}
</style>
