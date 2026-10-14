<script setup>
import { computed } from 'vue'

// 我的页：达标进度 → 名下数据 → 核验记录 → 成就徽章 → 我的队伍 → 快捷入口
// 负责人：李浩阳（原页面由李金燚创建，本次换成校园跑口径，去掉会员/睡眠等无关模块）

const goal = { total: 30, done: 11 }
const pct = computed(() => Math.round((goal.done / goal.total) * 100))
const left = computed(() => goal.total - goal.done)

const stats = [
  { value: '22.5', label: '累计公里' },
  { value: '11', label: '跑步次数' },
  { value: `7'12"`, label: '平均配速' }
]

// 防作弊核验的统计：被拦下的次数不计入成绩
const verify = { uploads: 6, ok: 5, blocked: 1, blockedText: '乘车 / 骑行 · 不计入' }

const badges = [
  { icon: '🏅', name: '首次达标', got: true },
  { icon: '🔥', name: '连续 7 天', got: true },
  { icon: '🌙', name: '夜跑达人', got: true },
  { icon: '⚡', name: '单次 5 km', got: false },
  { icon: '👑', name: '里程王', got: false }
]
const gotCount = badges.filter((b) => b.got).length

const team = { name: 'A 队', rank: 2, km: 68.4, members: ['同学甲', '同学乙', '同学丙'] }

const quicks = [
  { icon: '📚', label: '我的课程', to: '/courses' },
  { icon: '👥', label: '搭子墙', to: '/features/sports-wall' },
  { icon: '⚡', label: '能量联盟', to: '/features/energy-league' },
  { icon: '🧭', label: '玩法总览', to: '/home' }
]
</script>

<template>
  <div class="page">
    <!-- 用户 -->
    <section class="user-card">
      <span class="avatar">🧑‍🎓</span>
      <div class="user-info">
        <h3>李同学</h3>
        <p>计算机学院 · 2024 级</p>
      </div>
      <span class="level">K5</span>
    </section>

    <!-- 达标进度 -->
    <section class="card goal-card">
      <div class="goal-top">
        <strong>{{ goal.done }}<em>/{{ goal.total }}</em></strong>
        <span>本学期达标进度</span>
      </div>
      <div class="bar"><div class="bar-fill" :style="{ width: pct + '%' }"></div></div>
      <p class="goal-foot">还差 {{ left }} 次达标 · 当前 {{ pct }}%</p>
    </section>

    <!-- 名下数据 -->
    <section class="card stat-row">
      <div v-for="s in stats" :key="s.label" class="stat">
        <strong>{{ s.value }}</strong>
        <span>{{ s.label }}</span>
      </div>
    </section>

    <!-- 核验记录 -->
    <section class="card verify-card">
      <div class="v-head">
        <span>🛡️ 本周核验记录</span>
        <router-link to="/verify" class="v-more">判定原理 ›</router-link>
      </div>
      <div class="v-nums">
        <div class="v-ok"><strong>{{ verify.ok }}</strong><span>有效</span></div>
        <div class="v-bad"><strong>{{ verify.blocked }}</strong><span>未计入</span></div>
        <div><strong>{{ verify.uploads }}</strong><span>提交次数</span></div>
      </div>
      <p class="v-note">被拦下的那次判定为「{{ verify.blockedText }}」，不计入成绩</p>
    </section>

    <!-- 徽章 -->
    <div class="section-head">
      <h3>成就徽章</h3>
      <span class="more">已解锁 {{ gotCount }}/{{ badges.length }}</span>
    </div>
    <section class="card badge-grid">
      <div v-for="b in badges" :key="b.name" class="badge" :class="{ locked: !b.got }">
        <span class="b-icon">{{ b.icon }}</span>
        <span class="b-name">{{ b.name }}</span>
      </div>
    </section>

    <!-- 我的队伍 -->
    <div class="section-head">
      <h3>我的队伍</h3>
      <router-link to="/discover" class="more">本周第 {{ team.rank }} 名 ›</router-link>
    </div>
    <section class="card team-card">
      <div class="team-left">
        <span class="team-name">{{ team.name }}</span>
        <div class="members">
          <span v-for="m in team.members" :key="m">{{ m }}</span>
        </div>
      </div>
      <span class="team-km">{{ team.km }} km</span>
    </section>

    <!-- 快捷入口 -->
    <section class="card quick-row">
      <router-link v-for="q in quicks" :key="q.label" :to="q.to" class="quick">
        <span class="q-icon">{{ q.icon }}</span>
        <span>{{ q.label }}</span>
      </router-link>
    </section>
  </div>
</template>

<style scoped>
/* ===== 用户 ===== */
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27px;
}
.user-info {
  flex: 1;
}
.user-info h3 {
  font-size: 17px;
}
.user-info p {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 3px;
}
.level {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary-dark);
  background: var(--color-primary-light);
  padding: 4px 11px;
  border-radius: 999px;
}

/* ===== 达标 ===== */
.goal-card {
  margin-top: 14px;
}
.goal-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.goal-top strong {
  font-size: 28px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.goal-top strong em {
  font-style: normal;
  font-size: 14px;
  color: var(--color-text-light);
  font-weight: 600;
}
.goal-top span {
  font-size: 12px;
  color: var(--color-text-light);
}
.bar {
  height: 8px;
  border-radius: 4px;
  background: var(--color-primary-light);
  overflow: hidden;
  margin: 12px 0 8px;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #17c9ae, var(--color-primary-dark));
}
.goal-foot {
  font-size: 12px;
  color: var(--color-text-light);
}

/* ===== 数据 ===== */
.stat-row {
  margin-top: 12px;
  display: flex;
  padding: 14px 8px;
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.stat strong {
  font-size: 19px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.stat span {
  font-size: 11px;
  color: var(--color-text-light);
}

/* ===== 核验记录 ===== */
.verify-card {
  margin-top: 12px;
}
.v-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
}
.v-more {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-primary);
}
.v-nums {
  display: flex;
  gap: 8px;
  margin: 12px 0 10px;
}
.v-nums > div {
  flex: 1;
  border-radius: 12px;
  padding: 10px 0;
  text-align: center;
  background: var(--color-bg);
}
.v-nums strong {
  display: block;
  font-size: 19px;
  font-weight: 800;
}
.v-nums span {
  font-size: 11px;
  color: var(--color-text-light);
}
.v-ok {
  background: #e8f7ee !important;
}
.v-ok strong {
  color: var(--color-success);
}
.v-bad {
  background: #fdeceb !important;
}
.v-bad strong {
  color: var(--color-danger);
}
.v-note {
  font-size: 12px;
  color: #9a5b16;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 8px 12px;
  line-height: 1.5;
}

/* ===== 徽章 ===== */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 14px 10px;
}
.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.b-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.b-name {
  font-size: 10px;
  color: var(--color-text);
  text-align: center;
}
.badge.locked .b-icon {
  background: var(--color-bg);
  filter: grayscale(1);
  opacity: 0.55;
}
.badge.locked .b-name {
  color: var(--color-text-light);
}

/* ===== 队伍 ===== */
.team-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.team-left {
  min-width: 0;
}
.team-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-primary-dark);
}
.members {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.members span {
  font-size: 11px;
  color: var(--color-text-light);
  background: var(--color-bg);
  padding: 3px 9px;
  border-radius: 999px;
}
.team-km {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* ===== 快捷 ===== */
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
</style>
