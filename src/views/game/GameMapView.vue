<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  initGame,
  moveCharacter,
  startTimer,
  clearTimer,
  getState
} from '@/game/engine.js'
import { GAME_CONFIG } from '@/game/config.js'

const router = useRouter()
const state = ref(null)

// 控制：鼠标控制鼠，键盘方向键控制鼠；猫由简单 AI 追击
const catPos = computed(() => state.value?.cat ?? { x: 0, y: 0 })
const mousePos = computed(() => state.value?.mouse ?? { x: 0, y: 0 })
const distance = computed(() => state.value?.distance ?? 0)
const timeLeft = computed(() => state.value?.timeLeft ?? 0)
const status = computed(() => state.value?.status ?? 'idle')
const winner = computed(() => state.value?.winner ?? null)

// 地图比例：将模拟坐标映射到 CSS 百分比
function toPercent(pos) {
  if (!pos) return { left: '0%', top: '0%' }
  return {
    left: `${(pos.x / GAME_CONFIG.mapWidth) * 100}%`,
    top: `${(pos.y / GAME_CONFIG.mapHeight) * 100}%`
  }
}

// 简单 AI：猫朝鼠的方向移动一步
function catChase() {
  const s = getState()
  if (!s || s.status !== 'running') return
  const dx = s.mouse.x - s.cat.x
  const dy = s.mouse.y - s.cat.y
  const dist = Math.hypot(dx, dy) || 1
  const step = GAME_CONFIG.moveStep
  moveCharacter('cat', {
    dx: Math.round((dx / dist) * step),
    dy: Math.round((dy / dist) * step)
  })
  syncState()
}

// 玩家操控鼠
function moveMouse(dx, dy) {
  moveCharacter('mouse', { dx, dy })
  syncState()
  catChase()
  checkEnd()
}

function syncState() {
  state.value = getState()
}

function checkEnd() {
  const s = getState()
  if (s && (s.status === 'caught' || s.status === 'timeout')) {
    clearTimer()
    state.value = s
    setTimeout(() => router.push('/game/result'), 600)
  }
}

// 键盘控制
function onKey(e) {
  const step = GAME_CONFIG.moveStep
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      moveMouse(0, -step)
      break
    case 'ArrowDown':
      e.preventDefault()
      moveMouse(0, step)
      break
    case 'ArrowLeft':
      e.preventDefault()
      moveMouse(-step, 0)
      break
    case 'ArrowRight':
      e.preventDefault()
      moveMouse(step, 0)
      break
  }
}

function onTimerTick(s) {
  state.value = s
  catChase()
  checkEnd()
}

function startMatch() {
  initGame()
  syncState()
  startTimer(onTimerTick)
}

function backHome() {
  clearTimer()
  router.push('/')
}

onMounted(() => {
  startMatch()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  clearTimer()
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="page game-map">
    <div class="hud">
      <button class="back-btn" @click="backHome">← 退出</button>
      <div class="hud-stats">
        <span class="stat">距离 <strong>{{ distance }}m</strong></span>
        <span class="stat" :class="{ urgent: timeLeft <= 10 }">
          倒计时 <strong>{{ timeLeft }}s</strong>
        </span>
      </div>
    </div>

    <div class="map-area">
      <!-- 模拟校园地图背景 -->
      <div class="map-bg">
        <span class="landmark" style="left: 15%; top: 30%">教学楼</span>
        <span class="landmark" style="left: 60%; top: 20%">操场</span>
        <span class="landmark" style="left: 40%; top: 70%">图书馆</span>
        <span class="landmark" style="left: 80%; top: 60%">食堂</span>

        <!-- 猫 -->
        <div class="role cat" :style="toPercent(catPos)">🐱</div>
        <!-- 鼠 -->
        <div class="role mouse" :style="toPercent(mousePos)">🐭</div>
      </div>
    </div>

    <div class="controls">
      <p class="hint">用键盘 ↑ ↓ ← → 控制鼠（🐭）逃跑</p>
      <div class="dpad">
        <button @click="moveMouse(0, -GAME_CONFIG.moveStep)">↑</button>
        <div class="dpad-row">
          <button @click="moveMouse(-GAME_CONFIG.moveStep, 0)">←</button>
          <button @click="moveMouse(0, GAME_CONFIG.moveStep)">↓</button>
          <button @click="moveMouse(GAME_CONFIG.moveStep, 0)">→</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-map {
  padding: 12px;
}
.hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.back-btn {
  all: unset;
  cursor: pointer;
  color: var(--color-text-light);
  font-size: 14px;
}
.hud-stats {
  display: flex;
  gap: 16px;
}
.stat {
  font-size: 14px;
  color: var(--color-text-light);
}
.stat strong {
  color: var(--color-primary);
  font-size: 18px;
}
.stat.urgent strong {
  color: #e74c3c;
}

.map-area {
  width: 100%;
  aspect-ratio: 5 / 4;
  background: var(--color-white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.map-bg {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #eaf4ea 0%, #e8f0f8 100%);
}
.landmark {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 11px;
  color: var(--color-text-light);
  background: rgba(255, 255, 255, 0.7);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.role {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 28px;
  transition: left 0.3s ease, top 0.3s ease;
  z-index: 2;
}

.controls {
  margin-top: 20px;
  text-align: center;
}
.hint {
  font-size: 13px;
  color: var(--color-text-light);
  margin-bottom: 12px;
}
.dpad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.dpad button {
  width: 48px;
  height: 48px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-white);
  font-size: 18px;
  color: var(--color-primary);
}
.dpad button:active {
  background: var(--color-primary-light);
}
.dpad-row {
  display: flex;
  gap: 6px;
}
</style>
