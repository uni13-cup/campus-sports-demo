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
import CampusMap from './components/CampusMap.vue'

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
}

function startTimer() {
  if (timerId) return
  timerId = window.setInterval(advanceOneSecond, GAME_CONFIG.tickInterval)
}

function stopTimer() {
  if (!timerId) return
  window.clearInterval(timerId)
  timerId = null
}

function backToLobby() {
  stopTimer()
  router.push('/game')
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
  <main v-if="state" class="game-map-page">
    <header class="game-topbar">
      <button class="back-button" @click="backToLobby">← 返回大厅</button>
      <div class="game-title">
        <span>郑东校区 · 模拟定位</span>
        <strong>校园猫鼠大作战</strong>
      </div>
      <div class="phase-timer" :class="[phase, { urgent: timeLeft <= 5 }]">
        <span>{{ phase === 'hiding' ? '躲藏' : phase === 'chasing' ? '追捕' : '结束' }}</span>
        <strong>{{ timeLeft }}</strong>
        <small>秒</small>
      </div>
    </header>

    <section class="game-stage">
      <div class="map-panel">
        <CampusMap
          :players="players"
          :config="state.config"
          :phase="phase"
          @ready="startTimer"
        />
        <div v-if="phase === 'ended'" class="end-overlay">
          <strong>{{ state.winner === 'cat' ? '猫方获胜' : '鼠方获胜' }}</strong>
          <span>正在前往结算页</span>
        </div>
      </div>

      <aside class="game-sidebar">
        <section class="status-card status-grid">
          <div><span>存活鼠</span><strong>{{ mice.length }}</strong></div>
          <div><span>猫阵营</span><strong>{{ cats.length }}</strong></div>
          <div><span>最近目标</span><strong>{{ nearestMouseDistance }}<small>m</small></strong></div>
          <div><span>你的抓捕</span><strong>{{ humanCat?.captures ?? 0 }}</strong></div>
        </section>

        <section class="status-card mission-card">
          <span class="card-kicker">当前任务</span>
          <strong v-if="phase === 'hiding'">等待老鼠完成躲藏</strong>
          <strong v-else-if="phase === 'chasing'">在时间结束前抓住全部电脑鼠</strong>
          <strong v-else>本局已经结束</strong>
          <p>绿色虚线为活动边界；建筑和水域不可进入。当前位置均为二维模拟数据，不是真实 GPS。</p>
        </section>

        <section class="status-card legend-card">
          <span><i class="legend-dot player-cat"></i>玩家猫</span>
          <span><i class="legend-dot computer-cat"></i>转化后的电脑猫</span>
          <span><i class="legend-dot computer-mouse"></i>电脑鼠</span>
          <span><i class="legend-block"></i>不可进入建筑</span>
        </section>

        <section class="status-card control-card">
          <p>{{ phase === 'hiding' ? '躲藏阶段不可移动' : '方向键或按钮控制玩家猫' }}</p>
          <div class="dpad" :class="{ disabled: phase !== 'chasing' }">
            <button @click="moveCat(0, -GAME_CONFIG.moveStep)" aria-label="向上">↑</button>
            <div>
              <button @click="moveCat(-GAME_CONFIG.moveStep, 0)" aria-label="向左">←</button>
              <button @click="moveCat(0, GAME_CONFIG.moveStep)" aria-label="向下">↓</button>
              <button @click="moveCat(GAME_CONFIG.moveStep, 0)" aria-label="向右">→</button>
            </div>
          </div>
        </section>

        <p class="collision-note">建筑碰撞目前采用 OSM 建筑外包矩形近似，可在地图内开启“碰撞范围”核对。</p>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.game-map-page {
  min-height: 100vh;
  padding: 18px clamp(14px, 2.6vw, 34px) 24px;
  background:
    radial-gradient(circle at 20% -10%, rgba(53, 177, 119, 0.13), transparent 34%),
    #eff4f0;
  color: #183328;
}
.game-topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: min(1440px, 100%);
  margin: 0 auto 14px;
}
.back-button {
  justify-self: start;
  padding: 8px 12px;
  border: 1px solid rgba(34, 78, 60, 0.13);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.74);
  color: #426354;
  font-size: 12px;
  cursor: pointer;
}
.game-title { display: flex; flex-direction: column; align-items: center; line-height: 1.25; }
.game-title span { color: #628073; font-size: 10px; letter-spacing: 0.12em; }
.game-title strong { margin-top: 3px; font-size: clamp(17px, 2vw, 23px); }
.phase-timer {
  justify-self: end;
  display: flex;
  min-width: 112px;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  padding: 7px 11px;
  border-radius: 12px;
  background: #fff2c7;
  color: #805f00;
  box-shadow: 0 7px 22px rgba(39, 69, 56, 0.08);
}
.phase-timer span { margin-right: auto; font-size: 10px; font-weight: 750; }
.phase-timer strong { font-size: 25px; line-height: 1; }
.phase-timer small { font-size: 9px; }
.phase-timer.chasing { background: #ffe4df; color: #b93629; }
.phase-timer.ended { background: #dcebe2; color: #325c46; }
.phase-timer.urgent { animation: pulse 0.8s ease-in-out infinite alternate; }

.game-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 14px;
  width: min(1440px, 100%);
  margin: 0 auto;
}
.map-panel {
  position: relative;
  min-height: 680px;
  overflow: hidden;
  border: 1px solid rgba(35, 77, 60, 0.14);
  border-radius: 20px;
  background: #dce7dc;
  box-shadow: 0 18px 52px rgba(25, 61, 46, 0.14);
}
.game-sidebar { display: flex; flex-direction: column; gap: 10px; }
.status-card {
  border: 1px solid rgba(40, 82, 65, 0.1);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 8px 25px rgba(33, 67, 53, 0.07);
  backdrop-filter: blur(8px);
}
.status-grid { display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; }
.status-grid div { display: flex; flex-direction: column; gap: 3px; padding: 14px; }
.status-grid div:nth-child(odd) { border-right: 1px solid #edf1ee; }
.status-grid div:nth-child(-n + 2) { border-bottom: 1px solid #edf1ee; }
.status-grid span { color: #779084; font-size: 10px; }
.status-grid strong { color: #1d5a3d; font-size: 20px; }
.status-grid small { margin-left: 2px; font-size: 10px; }
.mission-card { padding: 16px; }
.card-kicker { display: block; margin-bottom: 5px; color: #16895a; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; }
.mission-card strong { font-size: 14px; line-height: 1.5; }
.mission-card p { margin: 9px 0 0; color: #6f8279; font-size: 10px; line-height: 1.65; }
.legend-card { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 6px; padding: 14px; }
.legend-card span { display: flex; align-items: center; gap: 6px; color: #5f786c; font-size: 10px; }
.legend-dot, .legend-block { width: 10px; height: 10px; flex: none; border-radius: 50%; }
.player-cat { background: #ff503e; box-shadow: 0 0 0 3px rgba(255, 80, 62, 0.18); }
.computer-cat { background: #9a78e8; }
.computer-mouse { background: #e6bd36; }
.legend-block { border-radius: 2px; background: #807b73; }
.control-card { padding: 14px; text-align: center; }
.control-card p { margin: 0 0 10px; color: #6e8379; font-size: 10px; }
.dpad { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.dpad div { display: flex; gap: 5px; }
.dpad button {
  width: 48px;
  height: 43px;
  border: 1px solid #d6e2db;
  border-radius: 10px;
  background: #f8fbf9;
  color: #17613f;
  font-size: 18px;
  cursor: pointer;
}
.dpad button:hover { border-color: #37a578; background: #eaf7f0; }
.dpad button:active { transform: translateY(1px); }
.dpad.disabled { opacity: 0.38; pointer-events: none; }
.collision-note { margin: 0 4px; color: #7f9188; font-size: 9px; line-height: 1.55; }
.end-overlay {
  position: absolute;
  z-index: 4;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(15, 42, 31, 0.48);
  color: #fff;
  backdrop-filter: blur(4px);
}
.end-overlay strong { font-size: 28px; }
.end-overlay span { margin-top: 5px; font-size: 11px; opacity: 0.8; }

@keyframes pulse { to { transform: scale(1.035); box-shadow: 0 7px 25px rgba(203, 58, 42, 0.2); } }

@media (max-width: 960px) {
  .game-stage { grid-template-columns: 1fr; }
  .map-panel { min-height: 66vh; }
  .game-sidebar { display: grid; grid-template-columns: 1fr 1fr; }
  .collision-note { grid-column: 1 / -1; }
}

@media (max-width: 620px) {
  .game-map-page { padding: 10px 9px 18px; }
  .game-topbar { grid-template-columns: auto 1fr auto; gap: 7px; }
  .back-button { padding: 7px 8px; font-size: 10px; }
  .game-title { align-items: flex-start; }
  .game-title span { display: none; }
  .game-title strong { font-size: 14px; }
  .phase-timer { min-width: 80px; padding: 7px 8px; }
  .phase-timer strong { font-size: 20px; }
  .map-panel { min-height: 62vh; border-radius: 15px; }
  .game-sidebar { grid-template-columns: 1fr; }
  .control-card { order: -1; }
  .legend-card { grid-template-columns: 1fr 1fr; }
}
</style>
