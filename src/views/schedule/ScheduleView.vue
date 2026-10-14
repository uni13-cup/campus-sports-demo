<script setup>
import { computed, ref } from 'vue'

// 计划页：达标进度 → 今日任务 → 本周跑步计划 → 可跑时段 → 约跑
// 负责人：李浩阳（原页面由李金燚创建，本次重排模块并补充约跑）

const goal = { total: 30, done: 11, km: 22.5, leftDays: 79 }
const left = computed(() => goal.total - goal.done)
const progress = computed(() => Math.round((goal.done / goal.total) * 100))
const avgKm = computed(() => (goal.km / goal.done).toFixed(1))

// 今天的建议量
const todayTask = { km: '3.5', min: 26, pace: `7'20"` }

// 本周计划：plan 计划公里，done 已完成公里，rest 休息日
const week = [
  { day: '一', plan: 3, done: 3 },
  { day: '二', plan: 3, done: 0, today: true },
  { day: '三', plan: 3, done: 0 },
  { day: '四', plan: 0, done: 0, rest: true },
  { day: '五', plan: 3, done: 0 },
  { day: '六', plan: 5, done: 0 },
  { day: '日', plan: 5, done: 0 }
]
const selectedDay = ref('二')
const currentWeek = computed(
  () => week.find((w) => w.day === selectedDay.value) || week[1]
)
const weekTotal = computed(() => week.reduce((s, w) => s + w.plan, 0))
const weekDone = computed(() => week.reduce((s, w) => s + w.done, 0))

const slots = [
  { t: '06-08', tag: '★黄金', hot: true },
  { t: '08-10' },
  { t: '10-12' },
  { t: '12-14', tag: '午休' },
  { t: '14-16' },
  { t: '16-18' },
  { t: '18-20', tag: '推荐', hot: true },
  { t: '20-22' }
]
const selectedSlot = ref('18-20')

const mateRuns = ref([
  { icon: '🌙', name: '夜跑 5 公里', when: '今晚 19:00 · 东操场', joined: false },
  { icon: '⏱️', name: '体测冲刺陪练', when: '周三 18:30 · 田径场', joined: false }
])

function joinMate(m) {
  m.joined = true
}
</script>

<template>
  <div class="page">
    <!-- 头部 -->
    <header class="page-head">
      <div>
        <h2>校园跑计划</h2>
        <p class="sub">本学期 {{ goal.total }} 次 · 还剩 {{ goal.leftDays }} 天</p>
      </div>
      <span class="pct">{{ progress }}%</span>
    </header>

    <!-- 达标进度 -->
    <section class="card goal-card">
      <div class="goal-top">
        <strong>{{ goal.done }}<em>/{{ goal.total }}</em></strong>
        <span>还差 <b>{{ left }}</b> 次达标</span>
      </div>
      <div class="bar"><div class="bar-fill" :style="{ width: progress + '%' }"></div></div>
      <p class="goal-foot">已跑 {{ goal.km }} km · 平均每次 {{ avgKm }} km</p>
    </section>

    <!-- 今日任务 -->
    <section class="today">
      <div class="today-info">
        <span class="today-tag">今天</span>
        <strong>{{ todayTask.km }} 公里</strong>
        <p>约 {{ todayTask.min }} 分钟 · 目标配速 {{ todayTask.pace }}</p>
      </div>
      <router-link to="/exercise" class="today-btn">去开跑</router-link>
    </section>

    <!-- 本周跑步计划 -->
    <div class="section-head">
      <h3>本周跑步计划</h3>
      <span class="more">{{ weekDone }} / {{ weekTotal }} km</span>
    </div>
    <section class="card week-card">
      <button
        v-for="w in week"
        :key="w.day"
        class="day-cell"
        :class="{ active: selectedDay === w.day, isRest: w.rest }"
        @click="selectedDay = w.day"
      >
        <span class="d">{{ w.day }}</span>
        <span class="v">{{ w.rest ? '休' : w.plan }}</span>
        <span class="flag" :class="{ ok: w.plan > 0 && w.done >= w.plan }"></span>
      </button>
    </section>
    <p class="week-tip">
      周{{ currentWeek.day }}：
      <template v-if="currentWeek.rest">安排休息，做点拉伸放松</template>
      <template v-else-if="currentWeek.done >= currentWeek.plan">已完成 {{ currentWeek.done }} km，干得不错</template>
      <template v-else>计划 {{ currentWeek.plan }} km，已完成 {{ currentWeek.done }} km</template>
    </p>

    <!-- 可跑时段 -->
    <div class="section-head">
      <h3>周{{ selectedDay }}可跑时段</h3>
      <span class="more">按课表空隙推算</span>
    </div>
    <p class="slots-tip">⚡ 18:00-20:00 晚间空闲最多，最适合校园跑</p>
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

    <!-- 约跑 -->
    <div class="section-head">
      <h3>约跑计划</h3>
      <router-link to="/discover" class="more">去操场 ›</router-link>
    </div>
    <section class="mate-list">
      <div v-for="m in mateRuns" :key="m.name" class="mate-card card">
        <span class="m-icon">{{ m.icon }}</span>
        <div class="m-info">
          <strong>{{ m.name }}</strong>
          <p>{{ m.when }}</p>
        </div>
        <button class="m-btn" :class="{ joined: m.joined }" @click="joinMate(m)">
          {{ m.joined ? '已约' : '一起' }}
        </button>
      </div>
    </section>

    <!-- 课表摘要 -->
    <section class="card brief">
      <span class="b-icon">📅</span>
      <p>本周 15 节课，其中 3 个晚上空闲 · <span>课表已和学习日程同步</span></p>
    </section>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.page-head h2 {
  font-size: 20px;
}
.sub {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 4px;
}
.pct {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

/* ===== 达标进度 ===== */
.goal-card {
  margin-top: 14px;
}
.goal-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.goal-top strong {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}
.goal-top strong em {
  font-style: normal;
  font-size: 15px;
  color: var(--color-text-light);
  font-weight: 600;
}
.goal-top span {
  font-size: 12px;
  color: var(--color-text-light);
}
.goal-top b {
  color: var(--color-primary);
  font-size: 15px;
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

/* ===== 今日任务 ===== */
.today {
  margin-top: 12px;
  border-radius: var(--radius);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(135deg, #12b3a0, var(--color-primary-dark));
  color: #fff;
  box-shadow: 0 8px 20px rgba(7, 120, 109, 0.26);
}
.today-tag {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 9px;
  border-radius: 999px;
}
.today-info strong {
  display: block;
  font-size: 22px;
  font-weight: 800;
  margin: 6px 0 2px;
}
.today-info p {
  font-size: 12px;
  opacity: 0.85;
}
.today-btn {
  flex-shrink: 0;
  background: #fff;
  color: var(--color-primary-dark);
  font-size: 13px;
  font-weight: 700;
  padding: 9px 18px;
  border-radius: 999px;
}

/* ===== 本周计划 ===== */
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
  padding: 9px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.day-cell .d {
  font-size: 12px;
  color: var(--color-text-light);
}
.day-cell .v {
  font-size: 13px;
  font-weight: 700;
}
.day-cell .flag {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-border);
}
.day-cell .flag.ok {
  background: var(--color-success);
}
.day-cell.isRest .v {
  color: var(--color-text-light);
  font-weight: 500;
}
.day-cell.active {
  background: var(--color-primary);
}
.day-cell.active .d,
.day-cell.active .v {
  color: #fff;
}
.day-cell.active .flag {
  background: rgba(255, 255, 255, 0.6);
}
.week-tip {
  font-size: 12px;
  color: var(--color-text-light);
  margin: 10px 2px 0;
}

/* ===== 可跑时段 ===== */
.slots-tip {
  font-size: 12px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 10px;
  padding: 8px 12px;
  margin-bottom: 10px;
}
.slots {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.slot {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 10px 2px;
  font-size: 12px;
  background: var(--color-white);
  color: var(--color-text);
}
.slot em {
  font-style: normal;
  font-size: 10px;
  color: var(--color-text-light);
  display: block;
}
.slot.hot {
  color: #b45309;
  background: #fff7ed;
  border-color: #fed7aa;
}
.slot.hot em {
  color: #f59e0b;
}
.slot.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.slot.active em {
  color: rgba(255, 255, 255, 0.85);
}

/* ===== 约跑 ===== */
.mate-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mate-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}
.m-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
}
.m-info {
  flex: 1;
  min-width: 0;
}
.m-info strong {
  font-size: 14px;
}
.m-info p {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 2px;
}
.m-btn {
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
}
.m-btn.joined {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

/* ===== 课表摘要 ===== */
.brief {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.b-icon {
  font-size: 17px;
}
.brief p {
  font-size: 13px;
}
.brief p span {
  color: var(--color-text-light);
  font-size: 12px;
}
</style>
