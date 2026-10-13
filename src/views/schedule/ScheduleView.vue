<script setup>
import { computed, ref } from 'vue'

// 日程页：校园跑达标规划 + 课表 + AI 推荐运动时段（对应参考视频日程页）
const goal = { total: 30, done: 11, km: 22.5, deadline: '12/31', leftDays: 79 }
const progress = computed(() => Math.round((goal.done / goal.total) * 100))
// SVG 圆环参数
const R = 30
const C = 2 * Math.PI * R
const dashOffset = computed(() => C * (1 - progress.value / 100))

const week = [
  { day: '一', n: 4 }, { day: '二', n: 2 }, { day: '三', n: 3 },
  { day: '四', n: 2 }, { day: '五', n: 2 }, { day: '六', n: 0 }, { day: '日', n: 0 }
]
const selectedDay = ref('二')

const dates = [
  { day: '一', d: 12 }, { day: '二', d: 13, today: true }, { day: '三', d: 14 },
  { day: '四', d: 15 }, { day: '五', d: 16 }, { day: '六', d: 17 }, { day: '日', d: 18 }
]

const slots = [
  { t: '06-08', tag: '★黄金', hot: true }, { t: '08-10' }, { t: '10-12' },
  { t: '12-14', tag: '午休' }, { t: '14-16' }, { t: '16-18' },
  { t: '18-20', tag: 'AI推荐', hot: true }, { t: '20-22' }
]
const selectedSlot = ref('18-20')
</script>

<template>
  <div class="page">
    <!-- 头部 -->
    <header class="page-head">
      <h2>🎓 校园跑规划</h2>
      <span class="ai-badge">⚡ AI 已学习你的课表</span>
    </header>

    <!-- 达标进度卡 -->
    <section class="goal-card">
      <p class="goal-tag">本学期校园跑</p>
      <div class="goal-main">
        <div class="goal-text">
          <h3>还差 <em>{{ goal.total - goal.done }}</em> 次就达标</h3>
          <p class="deadline">截止 {{ goal.deadline }} · 还剩 {{ goal.leftDays }} 天</p>
          <div class="bar"><div class="bar-fill" :style="{ width: progress + '%' }"></div></div>
          <p class="goal-foot">
            <span>已跑 {{ goal.done }} 次 · {{ goal.km }}km</span>
            <span>目标 {{ goal.total }} 次</span>
          </p>
        </div>
        <svg class="ring" viewBox="0 0 72 72">
          <circle cx="36" cy="36" :r="R" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="6" />
          <circle
            cx="36" cy="36" :r="R" fill="none" stroke="#a3e635" stroke-width="6"
            stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="dashOffset"
            transform="rotate(-90 36 36)"
          />
          <text x="36" y="41" text-anchor="middle" class="ring-text">{{ progress }}%</text>
        </svg>
      </div>
    </section>

    <!-- 我的课表 -->
    <div class="section-head">
      <h3>我的课表</h3>
      <span class="more">全部 ></span>
    </div>
    <section class="card week-card">
      <button
        v-for="w in week"
        :key="w.day"
        class="day-cell"
        :class="{ active: selectedDay === w.day }"
        @click="selectedDay = w.day"
      >
        <span class="d">{{ w.day }}</span>
        <span class="n" :class="{ free: w.n === 0 }">{{ w.n === 0 ? '休息' : w.n + ' 节' }}</span>
      </button>
    </section>

    <!-- AI 推算 -->
    <section class="ai-banner card">
      <span class="ai-icon">🪄</span>
      <p><strong>AI 推算：</strong>本周有 7 天晚间 18:00-20:00 空闲，最适合校园跑，已为你高亮预留。</p>
    </section>

    <!-- 本周日期 -->
    <section class="card date-row">
      <div v-for="x in dates" :key="x.d" class="date-cell" :class="{ today: x.today }">
        <span class="d">{{ x.day }}</span>
        <span class="num">{{ x.d }}</span>
        <span v-if="x.today" class="dot"></span>
      </div>
    </section>

    <!-- 运动时段 -->
    <div class="section-head">
      <h3>周{{ selectedDay }}运动安排</h3>
      <span class="more">5 个空闲时段</span>
    </div>
    <p class="slots-tip">根据课表自动推算你的可运动时间</p>
    <section class="slots">
      <button
        v-for="s in slots"
        :key="s.t"
        class="slot"
        :class="{ hot: s.hot, active: selectedSlot === s.t }"
        @click="selectedSlot = s.t"
      >
        {{ s.t }} <em v-if="s.tag">{{ s.tag }}</em>
      </button>
    </section>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-head h2 {
  font-size: 20px;
}
.ai-badge {
  font-size: 12px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 4px 10px;
  border-radius: 999px;
}
.goal-card {
  margin-top: 14px;
  border-radius: var(--radius);
  padding: 18px 16px;
  background: linear-gradient(135deg, #3b82f6, var(--color-primary-dark));
  color: #fff;
  box-shadow: 0 8px 20px rgba(46, 107, 255, 0.3);
}
.goal-tag {
  font-size: 12px;
  opacity: 0.85;
  background: rgba(255, 255, 255, 0.18);
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
}
.goal-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  gap: 12px;
}
.goal-text h3 {
  font-size: 19px;
  font-weight: 700;
}
.goal-text em {
  font-style: normal;
  font-size: 26px;
  color: #a3e635;
  padding: 0 2px;
}
.deadline {
  font-size: 12px;
  opacity: 0.85;
  margin: 4px 0 10px;
}
.bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.25);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 3px;
  background: #a3e635;
}
.goal-foot {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.9;
  min-width: 200px;
}
.ring {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
}
.ring-text {
  fill: #fff;
  font-size: 15px;
  font-weight: 700;
}
.week-card {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  padding: 12px 8px;
}
.day-cell {
  border: none;
  background: none;
  border-radius: 12px;
  padding: 8px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.day-cell .d {
  font-size: 12px;
  color: var(--color-text-light);
}
.day-cell .n {
  font-size: 12px;
  font-weight: 600;
}
.day-cell .n.free {
  color: var(--color-accent);
}
.day-cell.active {
  background: var(--color-primary);
}
.day-cell.active .d,
.day-cell.active .n {
  color: #fff;
}
.ai-banner {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: var(--color-primary-light);
  box-shadow: none;
  font-size: 13px;
  line-height: 1.6;
}
.ai-icon {
  font-size: 16px;
}
.date-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 12px 8px;
}
.date-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
}
.date-cell .d {
  font-size: 11px;
  color: var(--color-text-light);
}
.date-cell .num {
  font-size: 15px;
  font-weight: 600;
}
.date-cell.today .num {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.date-cell .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-primary);
}
.slots-tip {
  font-size: 12px;
  color: var(--color-text-light);
  margin: -6px 2px 10px;
}
.slots {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.slot {
  border: none;
  border-radius: 12px;
  padding: 10px 2px;
  font-size: 12px;
  background: var(--color-white);
  color: var(--color-text);
  box-shadow: var(--shadow);
}
.slot em {
  font-style: normal;
  font-size: 10px;
  color: var(--color-text-light);
  display: block;
}
.slot.hot {
  color: #65a30d;
  background: #f7fee7;
}
.slot.hot em {
  color: #84cc16;
}
.slot.active {
  background: var(--color-primary);
  color: #fff;
}
.slot.active em {
  color: rgba(255, 255, 255, 0.85);
}
</style>
