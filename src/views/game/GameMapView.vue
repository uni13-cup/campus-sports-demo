<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  calcDistance,
  getState,
  initGame,
  moveCharacter,
  tick,
  updateAi
} from '@/game/engine.js'
import { GAME_CONFIG } from '@/game/config.js'

const router = useRouter()
const state = ref(null)
const ending = ref(false)
let timerId = null

const phase = computed(() => state.value?.phase ?? 'hiding')
const players = computed(() => state.value?.players ?? [])
const humanCat = computed(() =>
  players.value.find((player) => player.controller === 'human')
)
const mice = computed(() => players.value.filter((player) => player.role === 'mouse'))
const cats = computed(() => players.value.filter((player) => player.role === 'cat'))
const activityBorderStyle = computed(() => {
  const config = state.value?.config
  if (!config) return {}
  return {
    left: `${config.boundaryPadding / config.mapWidth * 100}%`,
    right: `${config.boundaryPadding / config.mapWidth * 100}%`,
    top: `${config.boundaryPadding / config.mapHeight * 100}%`,
    bottom: `${config.boundaryPadding / config.mapHeight * 100}%`
  }
})
const timeLeft = computed(() => {
  if (!state.value) return 0
  return phase.value === 'hiding'
    ? state.value.hidingTimeLeft
    : state.value.chasingTimeLeft
})
const nearestMouseDistance = computed(() => {
  if (!humanCat.value || mice.value.length === 0) return 0
  return Math.round(Math.min(
    ...mice.value.map((mouse) =>
      calcDistance(humanCat.value.position, mouse.position)
    )
  ))
})

function toPercent(position) {
  return {
    left: `${position.x / GAME_CONFIG.mapWidth * 100}%`,
    top: `${position.y / GAME_CONFIG.mapHeight * 100}%`
  }
}

function obstacleStyle(obstacle) {
  return {
    left: `${obstacle.x / GAME_CONFIG.mapWidth * 100}%`,
    top: `${obstacle.y / GAME_CONFIG.mapHeight * 100}%`,
    width: `${obstacle.width / GAME_CONFIG.mapWidth * 100}%`,
    height: `${obstacle.height / GAME_CONFIG.mapHeight * 100}%`
  }
}

function moveCat(dx, dy) {
  if (phase.value !== 'chasing' || ending.value) return
  state.value = moveCharacter('cat', { dx, dy })
  checkEnd()
}

function advanceOneSecond() {
  tick()
  updateAi()
  state.value = getState()
  checkEnd()
}

function checkEnd() {
  if (!state.value || state.value.phase !== 'ended' || ending.value) return
  ending.value = true
  stopTimer()
  window.setTimeout(() => router.push('/game/result'), 900)
}

function startMatch() {
  state.value = initGame()
  ending.value = false
  timerId = window.setInterval(advanceOneSecond, GAME_CONFIG.tickInterval)
}

function stopTimer() {
  if (!timerId) return
  window.clearInterval(timerId)
  timerId = null
}

function backHome() {
  stopTimer()
  router.push('/')
}

function onKey(event) {
  const step = GAME_CONFIG.moveStep
  const moves = {
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0]
  }
  const move = moves[event.key]
  if (!move) return
  event.preventDefault()
  moveCat(...move)
}

onMounted(() => {
  startMatch()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  stopTimer()
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="page game-map" v-if="state">
    <header class="hud">
      <button class="back-btn" @click="backHome">← 退出</button>
      <div class="phase-pill" :class="phase">
        {{ phase === 'hiding' ? '躲藏阶段' : phase === 'chasing' ? '追捕阶段' : '本局结束' }}
      </div>
      <div class="timer" :class="{ urgent: timeLeft <= 5 }">
        {{ timeLeft }}<small>秒</small>
      </div>
    </header>

    <section class="scoreboard">
      <div><span>存活鼠</span><strong>{{ mice.length }}</strong></div>
      <div><span>猫阵营</span><strong>{{ cats.length }}</strong></div>
      <div><span>最近距离</span><strong>{{ nearestMouseDistance }}m</strong></div>
      <div><span>玩家抓捕</span><strong>{{ humanCat?.captures ?? 0 }}</strong></div>
    </section>

    <div class="map-area">
      <div class="map-bg">
        <div class="activity-border" :style="activityBorderStyle"></div>
        <div class="sports-field">
          <div class="field-line"></div>
        </div>
        <div class="road road-horizontal"></div>
        <div class="road road-vertical"></div>
        <div class="plaza"></div>

        <div
          v-for="obstacle in state.config.obstacles"
          :key="obstacle.id"
          class="building"
          :style="obstacleStyle(obstacle)"
        ></div>

        <div
          v-for="player in players"
          :key="player.id"
          class="role"
          :class="[
            player.role,
            player.controller,
            { converted: player.role === 'cat' && player.controller === 'ai' }
          ]"
          :style="toPercent(player.position)"
          :title="player.id"
        >
          <span class="role-icon">{{ player.role === 'cat' ? '🐱' : '🐭' }}</span>
          <small v-if="player.controller === 'human'">你</small>
        </div>

        <div class="phase-overlay" v-if="phase === 'hiding'">
          <strong>老鼠躲藏中</strong>
          <span>{{ timeLeft }} 秒后开始追捕</span>
        </div>
        <div class="phase-overlay result" v-else-if="phase === 'ended'">
          <strong>{{ state.winner === 'cat' ? '猫方获胜！' : '鼠方获胜！' }}</strong>
          <span>正在前往结算页</span>
        </div>
      </div>
    </div>

    <div class="legend">
      <span><i class="legend-dot human-dot"></i>玩家猫</span>
      <span><i class="legend-dot ai-cat-dot"></i>电脑猫</span>
      <span><i class="legend-dot mouse-dot"></i>电脑鼠</span>
      <span><i class="legend-block"></i>不可进入建筑</span>
    </div>

    <div class="controls">
      <p class="hint">
        {{ phase === 'hiding' ? '躲藏阶段，猫暂时不能移动' : '使用键盘方向键或按钮控制猫追捕' }}
      </p>
      <div class="dpad" :class="{ disabled: phase !== 'chasing' }">
        <button @click="moveCat(0, -GAME_CONFIG.moveStep)" aria-label="向上">↑</button>
        <div class="dpad-row">
          <button @click="moveCat(-GAME_CONFIG.moveStep, 0)" aria-label="向左">←</button>
          <button @click="moveCat(0, GAME_CONFIG.moveStep)" aria-label="向下">↓</button>
          <button @click="moveCat(GAME_CONFIG.moveStep, 0)" aria-label="向右">→</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-map { padding: 12px; }
.hud {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin-bottom: 10px;
}
.back-btn {
  all: unset;
  cursor: pointer;
  color: var(--color-text-light);
  font-size: 14px;
}
.phase-pill {
  padding: 6px 14px;
  border-radius: 999px;
  background: #fff3cd;
  color: #8a6400;
  font-size: 13px;
  font-weight: 700;
}
.phase-pill.chasing { background: #ffe3e3; color: #bb2d3b; }
.phase-pill.ended { background: #e1f3e5; color: #28733b; }
.timer {
  justify-self: end;
  color: var(--color-primary);
  font-size: 24px;
  font-weight: 800;
}
.timer small { margin-left: 2px; font-size: 12px; font-weight: 500; }
.timer.urgent { color: #e74c3c; }
.scoreboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.scoreboard div {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--color-white);
  box-shadow: var(--shadow);
}
.scoreboard span { color: var(--color-text-light); font-size: 11px; }
.scoreboard strong { margin-top: 2px; color: var(--color-primary); font-size: 17px; }
.map-area {
  width: 100%;
  aspect-ratio: 5 / 4;
  overflow: hidden;
  border-radius: var(--radius);
  background: #dcebd8;
  box-shadow: var(--shadow);
}
.map-bg {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    linear-gradient(90deg, transparent 49%, rgba(255, 255, 255, 0.35) 50%, transparent 51%),
    linear-gradient(#dcebd8, #cfe4ca);
}
.activity-border {
  position: absolute;
  border: 2px dashed rgba(37, 105, 64, 0.55);
  border-radius: 16px;
}
.sports-field {
  position: absolute;
  left: 4%;
  top: 12.5%;
  width: 34%;
  height: 75%;
  box-sizing: border-box;
  border: 9px solid #b97867;
  border-radius: 42px;
  background: #7fbe76;
  color: rgba(22, 80, 40, 0.85);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}
.field-line { position: absolute; inset: 13%; border: 1px solid rgba(255, 255, 255, 0.75); }
.field-line::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  height: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.75);
}
.road {
  position: absolute;
  background: rgba(242, 239, 218, 0.8);
  border: 1px solid rgba(176, 170, 140, 0.45);
}
.road-horizontal { left: 38%; top: 42%; width: 58%; height: 11%; }
.road-vertical { left: 62%; top: 3%; width: 9%; height: 92%; }
.plaza {
  position: absolute;
  left: 73%;
  top: 79%;
  width: 14%;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  border: 6px double #d0b66f;
  border-radius: 50%;
  background: #efe5bd;
  color: #7c682e;
  font-size: 10px;
  text-align: center;
}
.building {
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  padding: 3px;
  border: 2px solid #6f6a64;
  border-radius: 5px;
  background: #dad6cf;
  color: #4b4743;
  font-size: 9px;
  font-weight: 700;
  text-align: center;
}
.role {
  position: absolute;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  transform: translate(-50%, -50%);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  transition: left 0.22s ease, top 0.22s ease;
}
.role-icon { font-size: 20px; line-height: 1; }
.role.mouse { background: #fff2ad; }
.role.cat { background: #cbe8ff; }
.role.human {
  width: 38px;
  height: 38px;
  border-color: #ff5c45;
  box-shadow: 0 0 0 4px rgba(255, 92, 69, 0.2), 0 3px 8px rgba(0, 0, 0, 0.25);
}
.role.converted { background: #d9c9ff; }
.role small {
  position: absolute;
  top: -13px;
  padding: 1px 5px;
  border-radius: 8px;
  background: #ff5c45;
  color: white;
  font-size: 9px;
  white-space: nowrap;
}
.phase-overlay {
  position: absolute;
  z-index: 9;
  left: 50%;
  top: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 170px;
  padding: 16px 22px;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 14px;
  background: rgba(24, 58, 35, 0.84);
  color: white;
  backdrop-filter: blur(5px);
}
.phase-overlay strong { font-size: 20px; }
.phase-overlay span { font-size: 12px; opacity: 0.88; }
.phase-overlay.result { background: rgba(112, 55, 20, 0.88); }
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 10px;
  color: var(--color-text-light);
  font-size: 11px;
}
.legend span { display: inline-flex; align-items: center; gap: 4px; }
.legend-dot,
.legend-block { width: 10px; height: 10px; border-radius: 50%; }
.human-dot { background: #ff5c45; }
.ai-cat-dot { background: #9f7aea; }
.mouse-dot { background: #e6be38; }
.legend-block { border-radius: 2px; background: #8f8981; }
.controls { margin-top: 14px; text-align: center; }
.hint { margin-bottom: 9px; color: var(--color-text-light); font-size: 12px; }
.dpad { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.dpad-row { display: flex; gap: 5px; }
.dpad button {
  width: 44px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-white);
  color: var(--color-primary);
  font-size: 17px;
  cursor: pointer;
}
.dpad button:active { background: var(--color-primary-light); }
.dpad.disabled { opacity: 0.45; pointer-events: none; }

@media (max-width: 520px) {
  .scoreboard { grid-template-columns: repeat(2, 1fr); }
  .map-area { min-height: 360px; aspect-ratio: auto; }
  .building { font-size: 8px; }
  .role { width: 28px; height: 28px; }
}
</style>
