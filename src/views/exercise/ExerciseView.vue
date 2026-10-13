<script setup>
import { computed, onUnmounted, ref } from 'vue'

// 运动页：模拟地图轨迹 + 跑步模式 + 陪跑模式 + GO 计时（对应参考视频运动页）
const modes = ['目标跑', '自由跑', '课程跑', '自定义']
const activeMode = ref('自由跑')

const sports = [
  { icon: '➕', label: '更多运动' },
  { icon: '🏃', label: '校园跑', active: true },
  { icon: '🚶', label: '户外行走' },
  { icon: '⏱️', label: '体测模拟' }
]

// GO 计时（演示用本地计时，非真实 GPS）
const running = ref(false)
const seconds = ref(0)
let timer = null

const durationText = computed(() => {
  const m = String(Math.floor(seconds.value / 60)).padStart(2, '0')
  const s = String(seconds.value % 60).padStart(2, '0')
  return `${m}:${s}`
})
const kmText = computed(() => (seconds.value * 0.0035).toFixed(2))
const kcalText = computed(() => Math.round(seconds.value * 0.18))
const paceText = computed(() => (seconds.value === 0 ? `5'57"` : `6'0${seconds.value % 10}'`))

function toggleRun() {
  running.value = !running.value
  if (running.value) {
    timer = setInterval(() => seconds.value++, 1000)
  } else {
    clearInterval(timer)
  }
}
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="page exercise-page">
    <!-- 模拟地图 -->
    <section class="map-card">
      <svg class="map-svg" viewBox="0 0 360 200">
        <rect width="360" height="200" fill="#e8f0e4" />
        <ellipse cx="70" cy="60" rx="46" ry="30" fill="#d3e7c8" />
        <ellipse cx="290" cy="40" rx="52" ry="26" fill="#d3e7c8" />
        <ellipse cx="300" cy="150" rx="40" ry="24" fill="#cfe0f2" />
        <path
          d="M60,130 C60,80 120,70 180,80 C240,90 300,80 310,120 C318,155 240,170 170,160 C100,150 60,160 60,130 Z"
          fill="none" stroke="#2e6bff" stroke-width="4" stroke-linecap="round"
        />
        <circle cx="180" cy="80" r="7" fill="#fff" stroke="#2e6bff" stroke-width="4" />
      </svg>
      <div class="map-actions">
        <button class="map-btn">🛰️<span>GPS</span></button>
        <button class="map-btn">👥<span>组队</span></button>
        <button class="map-btn">🗺️<span>路线</span></button>
      </div>
    </section>

    <!-- 模式 pills -->
    <div class="mode-pills card">
      <button
        v-for="m in modes"
        :key="m"
        class="pill"
        :class="{ active: activeMode === m }"
        @click="activeMode = m"
      >{{ m }}</button>
    </div>

    <!-- 运动类型 -->
    <div class="sport-row card">
      <div v-for="s in sports" :key="s.label" class="sport" :class="{ active: s.active }">
        <span class="sport-icon">{{ s.icon }}</span>
        <span>{{ s.label }}</span>
      </div>
    </div>

    <!-- 特色玩法：猫鼠大作战入口 -->
    <router-link to="/game" class="game-entry">
      <span class="game-emoji">🐱🐭</span>
      <div class="game-info">
        <strong>校园猫鼠大作战</strong>
        <p>模拟追逐 · 真实判定 · 和好友在校园地图上开一局</p>
      </div>
      <span class="go-arrow">›</span>
    </router-link>

    <!-- 陪跑模式 -->
    <router-link to="/features/ai-pacer" class="pacer-row card">
      <span class="pacer-label">陪跑模式</span>
      <span class="pacer-value">🤖 语音轻松跑 · 自由版 ›</span>
    </router-link>

    <!-- 数据统计 -->
    <div class="stats card">
      <div class="stat"><strong>{{ kmText }}</strong><span>公里</span></div>
      <div class="stat"><strong>{{ kcalText }}</strong><span>千卡</span></div>
      <div class="stat"><strong>{{ durationText }}</strong><span>时长</span></div>
      <div class="stat"><strong>{{ paceText }}</strong><span>配速</span></div>
    </div>

    <!-- GO -->
    <div class="go-row">
      <button class="side-btn">🎵<span>音乐</span></button>
      <button class="go-btn" :class="{ running }" @click="toggleRun">
        {{ running ? '暂停' : 'GO' }}
      </button>
      <button class="side-btn">🎒<span>装备</span></button>
    </div>
  </div>
</template>

<style scoped>
.exercise-page {
  padding-top: 12px;
}
.map-card {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}
.map-svg {
  display: block;
  width: 100%;
  height: auto;
}
.map-actions {
  position: absolute;
  top: 12px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.map-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
}
.map-btn span {
  font-size: 9px;
  color: var(--color-text-light);
}
.mode-pills {
  margin-top: 12px;
  display: flex;
  gap: 6px;
  padding: 6px;
  border-radius: 999px;
}
.pill {
  flex: 1;
  border: none;
  border-radius: 999px;
  background: none;
  padding: 8px 0;
  font-size: 13px;
  color: var(--color-text-light);
}
.pill.active {
  background: var(--color-dark);
  color: #fff;
  font-weight: 600;
}
.sport-row {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  padding: 12px 10px;
}
.sport {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--color-text-light);
  width: 25%;
}
.sport-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.sport.active {
  color: var(--color-primary);
  font-weight: 600;
}
.sport.active .sport-icon {
  background: var(--color-primary-light);
  box-shadow: inset 0 0 0 1.5px var(--color-primary);
}
.game-entry {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: var(--radius);
  padding: 14px 16px;
  background: linear-gradient(135deg, #1b2a4a, #2e4a8f);
  color: #fff;
  box-shadow: 0 8px 20px rgba(27, 42, 74, 0.3);
}
.game-emoji {
  font-size: 26px;
}
.game-info {
  flex: 1;
  min-width: 0;
}
.game-info strong {
  font-size: 15px;
}
.game-info p {
  font-size: 12px;
  opacity: 0.75;
  margin-top: 2px;
}
.go-arrow {
  font-size: 22px;
  opacity: 0.7;
}
.pacer-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  font-size: 14px;
}
.pacer-label {
  font-weight: 600;
  color: var(--color-text);
}
.pacer-value {
  color: var(--color-text-light);
  font-size: 13px;
}
.stats {
  margin-top: 12px;
  display: flex;
  padding: 14px 8px;
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat strong {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
.stat span {
  font-size: 11px;
  color: var(--color-text-light);
}
.go-row {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
}
.go-btn {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #4d86ff, var(--color-primary-dark));
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
  box-shadow: 0 10px 24px rgba(46, 107, 255, 0.45);
}
.go-btn.running {
  background: linear-gradient(135deg, #f97316, #dc2626);
  box-shadow: 0 10px 24px rgba(249, 115, 22, 0.45);
}
.side-btn {
  border: none;
  background: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 18px;
}
.side-btn span {
  font-size: 11px;
  color: var(--color-text-light);
}
</style>
