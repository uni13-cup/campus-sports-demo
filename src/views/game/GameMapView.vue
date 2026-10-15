<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  calcDistance,
  initGame
} from '@/game/engine.js'
import {
  advanceSimulation,
  clampFrameDelta,
  FIXED_STEP_SECONDS
} from '@/game/simulation.js'
import { updateNavigatingAi } from '@/game/navigation.js'
import { updateCaptureFlow } from '@/game/capture.js'
import { saveGameResult } from '@/game/result-store.js'
import { loadGameSession } from '@/game/game-session.js'
import CampusMap from './components/CampusMap.vue'

const router = useRouter()
const state = ref(null)
const ending = ref(false)
const touchInput = ref({ x: 0, y: 0 })
const muted = ref(false)
const feedback = ref('')
const phaseCue = ref('')
const conversionBurst = ref(false)
const hudExpanded = ref(true)
const pressedKeys = new Set()
let animationFrameId = null
let simulationStarted = false
let lastFrameTime = null
let accumulatedTime = 0
let feedbackTimer = null
let phaseCueTimer = null
let conversionTimer = null
let audioContext = null

const phase = computed(() => state.value?.phase ?? 'hiding')
const players = computed(() => state.value?.players ?? [])
const humanPlayer = computed(() =>
  players.value.find((player) => player.controller === 'human')
)
const mice = computed(() => players.value.filter((player) => player.role === 'mouse'))
const cats = computed(() => players.value.filter((player) => player.role === 'cat'))
const timeLeft = computed(() => {
  if (!state.value) return 0
  const remaining = phase.value === 'hiding'
    ? state.value.hidingTimeLeft
    : state.value.chasingTimeLeft
  return Math.max(0, Math.ceil(remaining))
})
const nearestOpponent = computed(() => {
  if (!humanPlayer.value) return null
  const opponents = humanPlayer.value.role === 'cat' ? mice.value : cats.value
  return opponents
    .filter((player) => player.id !== humanPlayer.value.id)
    .map((player) => ({
      player,
      distance: calcDistance(humanPlayer.value.position, player.position)
    }))
    .sort((left, right) => left.distance - right.distance)[0]
})
const nearestOpponentDistance = computed(() =>
  nearestOpponent.value ? nearestOpponent.value.distance.toFixed(1) : '0.0'
)
const playerCanMove = computed(() =>
  phase.value === 'chasing' ||
  (phase.value === 'hiding' && humanPlayer.value?.role === 'mouse')
)
const threatLevel = computed(() => {
  if (phase.value !== 'chasing' || !nearestOpponent.value) return 'standby'
  if (nearestOpponent.value.distance <= state.value.config.catchThreshold * 2) return 'danger'
  if (nearestOpponent.value.distance <= 160) return 'near'
  return 'tracking'
})
const recentEvents = computed(() => (state.value?.events ?? [])
  .filter((event) => ['capture-candidate', 'capture-confirmed', 'role-converted'].includes(event.type))
  .slice(-3)
  .reverse())

function eventText(event) {
  if (event.type === 'capture-candidate') return `${event.mouseId} 进入抓捕范围`
  if (event.type === 'capture-confirmed') return `${event.mouseId} 已被 ${event.catId} 抓获`
  if (event.type === 'role-converted') return `${event.playerId} 已加入猫阵营`
  return '赛事状态更新'
}

function currentInput() {
  let x = touchInput.value.x
  let y = touchInput.value.y
  if (pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA')) x -= 1
  if (pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD')) x += 1
  if (pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW')) y -= 1
  if (pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS')) y += 1
  return { x, y }
}

function runFrame(timestamp) {
  animationFrameId = window.requestAnimationFrame(runFrame)
  if (!simulationStarted || ending.value) {
    lastFrameTime = timestamp
    return
  }
  if (lastFrameTime === null) {
    lastFrameTime = timestamp
    return
  }

  accumulatedTime += clampFrameDelta((timestamp - lastFrameTime) / 1000)
  lastFrameTime = timestamp
  while (accumulatedTime >= FIXED_STEP_SECONDS && !ending.value) {
    state.value = advanceSimulation(
      state.value,
      currentInput(),
      FIXED_STEP_SECONDS,
      {
        aiUpdater: updateNavigatingAi,
        captureUpdater: updateCaptureFlow
      }
    )
    accumulatedTime -= FIXED_STEP_SECONDS
    checkEnd()
  }
}

function checkEnd() {
  if (!state.value || state.value.phase !== 'ended' || ending.value) return
  ending.value = true
  saveGameResult(state.value)
  showFeedback(state.value.winner === 'cat' ? '全部老鼠已抓获！' : '追捕时间结束')
  playFeedback('end')
  window.setTimeout(() => router.push('/game/result'), 1100)
}

function startMatch() {
  const session = loadGameSession()
  state.value = initGame({ aiSeed: Date.now(), humanRole: session.humanRole })
  ending.value = false
  accumulatedTime = 0
  lastFrameTime = null
}

function startSimulation() {
  simulationStarted = true
  lastFrameTime = null
}

function backToLobby() {
  router.push('/game')
}

function onKeyDown(event) {
  const supported = [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyW', 'KeyA', 'KeyS', 'KeyD'
  ]
  if (!supported.includes(event.code)) return
  event.preventDefault()
  unlockAudio()
  pressedKeys.add(event.code)
}

function onKeyUp(event) {
  pressedKeys.delete(event.code)
}

function holdDirection(x, y, event) {
  event?.preventDefault()
  if (!playerCanMove.value) return
  unlockAudio()
  touchInput.value = { x, y }
}

function showFeedback(message) {
  feedback.value = message
  if (feedbackTimer) window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => { feedback.value = '' }, 1800)
}

function showPhaseCue(message) {
  phaseCue.value = message
  if (phaseCueTimer) window.clearTimeout(phaseCueTimer)
  phaseCueTimer = window.setTimeout(() => { phaseCue.value = '' }, 1300)
}

function unlockAudio() {
  if (muted.value || audioContext) return
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  audioContext = new AudioContextClass()
  audioContext.resume?.()
}

function playFeedback(type) {
  if (muted.value || !audioContext) return
  const sequences = {
    capture: [720, 960],
    chase: [460, 620],
    danger: [330],
    end: [520, 700, 900]
  }
  const startAt = audioContext.currentTime
  for (const [index, frequency] of (sequences[type] ?? [420]).entries()) {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const toneStart = startAt + index * 0.085
    oscillator.type = type === 'danger' ? 'triangle' : 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, toneStart)
    gain.gain.exponentialRampToValueAtTime(0.065, toneStart + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.16)
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(toneStart)
    oscillator.stop(toneStart + 0.18)
  }
}

function toggleMute() {
  muted.value = !muted.value
  if (muted.value) audioContext?.suspend?.()
  else audioContext?.resume?.()
}

function releaseDirection() {
  touchInput.value = { x: 0, y: 0 }
}

function onVisibilityChange() {
  pressedKeys.clear()
  releaseDirection()
  lastFrameTime = null
  accumulatedTime = 0
}

onMounted(() => {
  startMatch()
  animationFrameId = window.requestAnimationFrame(runFrame)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('pointerup', releaseDirection)
  window.addEventListener('pointercancel', releaseDirection)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  simulationStarted = false
  if (animationFrameId) window.cancelAnimationFrame(animationFrameId)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('pointerup', releaseDirection)
  window.removeEventListener('pointercancel', releaseDirection)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (feedbackTimer) window.clearTimeout(feedbackTimer)
  if (phaseCueTimer) window.clearTimeout(phaseCueTimer)
  if (conversionTimer) window.clearTimeout(conversionTimer)
  audioContext?.close?.()
})

watch(() => state.value?.eventSequence ?? 0, (current, previous = 0) => {
  const newEvents = (state.value?.events ?? []).filter((event) => event.id > previous)
  if (newEvents.some((event) => event.type === 'capture-confirmed')) {
    const humanId = humanPlayer.value?.id
    const humanConverted = newEvents.some((event) =>
      event.type === 'role-converted' && event.playerId === humanId
    )
    showFeedback(humanConverted ? '你被抓到了，已转换为猫阵营！' : '抓捕成功，老鼠已加入猫阵营')
    conversionBurst.value = true
    if (conversionTimer) window.clearTimeout(conversionTimer)
    conversionTimer = window.setTimeout(() => { conversionBurst.value = false }, 700)
    playFeedback('capture')
  }
})

watch(phase, (current, previous) => {
  if (current === 'chasing' && previous === 'hiding') {
    showFeedback(humanPlayer.value?.role === 'mouse'
      ? '追捕开始 · 躲开 AI 猫'
      : '追捕开始 · 自由选择附近老鼠')
    showPhaseCue('追捕开始')
    playFeedback('chase')
  }
})

watch(threatLevel, (current, previous) => {
  if (current === 'danger' && previous !== 'danger') {
    showFeedback(humanPlayer.value?.role === 'mouse'
      ? `危险 · AI 猫已进入 ${state.value?.config.catchThreshold ?? 80}m 抓捕范围`
      : `老鼠接近 · 进入 ${state.value?.config.catchThreshold ?? 80}m 自动抓捕`)
    playFeedback('danger')
  }
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
      <div class="map-panel" :class="{ 'capture-flash': conversionBurst }">
        <CampusMap
          :players="players"
          :config="state.config"
          :phase="phase"
          :capture-candidate="state.captureCandidate"
          @ready="startSimulation"
        />

        <aside class="match-hud" :class="{ collapsed: !hudExpanded }">
          <button class="hud-toggle" @click="hudExpanded = !hudExpanded">
            {{ hudExpanded ? '收起战况' : '展开战况' }}
          </button>
          <div class="status-grid">
            <div><span>存活鼠</span><strong>{{ mice.length }}</strong></div>
            <div><span>猫阵营</span><strong>{{ cats.length }}</strong></div>
            <div><span>最近{{ humanPlayer?.role === 'cat' ? '老鼠' : '猫' }}</span><strong>{{ nearestOpponentDistance }}<small>m</small></strong></div>
            <div><span>你的身份</span><strong>{{ humanPlayer?.role === 'cat' ? '猫' : '鼠' }}</strong></div>
          </div>

          <div v-if="hudExpanded" class="hud-details">
            <div class="target-card" :class="threatLevel">
              <span class="card-kicker">追踪态势</span>
              <strong v-if="phase === 'hiding'">{{ humanPlayer?.role === 'mouse' ? '利用 5 秒提前躲藏' : '等待追捕开始' }}</strong>
              <strong v-else-if="nearestOpponent">
                <template v-if="humanPlayer?.role === 'cat'">
                  {{ threatLevel === 'danger' ? '已有老鼠进入抓捕距离' : threatLevel === 'near' ? '附近发现电脑鼠' : '自由追逐任意老鼠' }}
                </template>
                <template v-else>
                  {{ threatLevel === 'danger' ? '危险：AI 猫已经逼近' : threatLevel === 'near' ? 'AI 猫正在附近追踪' : '保持移动，远离 AI 猫' }}
                </template>
              </strong>
              <strong v-else>{{ humanPlayer?.role === 'cat' ? '全部目标已清除' : '暂未发现猫' }}</strong>
              <p v-if="humanPlayer?.role === 'cat'">靠近任意老鼠至 {{ state.config.catchThreshold }}m 内，只转换距离最近的一只。</p>
              <p v-else>与猫距离小于等于 {{ state.config.catchThreshold }}m 时会被抓，随后转为玩家猫继续比赛。</p>
            </div>

            <div v-if="recentEvents.length" class="event-feed" aria-label="赛事事件">
              <span class="card-kicker">赛事播报</span>
              <p v-for="event in recentEvents" :key="event.id">{{ eventText(event) }}</p>
            </div>

            <p class="simulation-note">
              模拟定位 · 约 {{ state.config.movementPresentation?.demoMultiplier ?? 7 }}× 加速演示。建筑碰撞仍为 OSM 外包矩形近似。
            </p>
          </div>
        </aside>

        <section class="movement-deck" aria-label="持续移动控制">
          <span>{{ playerCanMove ? '按住移动' : '等待躲藏结束' }}</span>
          <div class="dpad" :class="{ disabled: !playerCanMove }">
            <button @pointerdown="holdDirection(0, -1, $event)" aria-label="向上">↑</button>
            <div>
              <button @pointerdown="holdDirection(-1, 0, $event)" aria-label="向左">←</button>
              <button @pointerdown="holdDirection(0, 1, $event)" aria-label="向下">↓</button>
              <button @pointerdown="holdDirection(1, 0, $event)" aria-label="向右">→</button>
            </div>
          </div>
          <button class="sound-toggle" @click="toggleMute" :aria-label="muted ? '打开事件提示音' : '关闭事件提示音'">
            {{ muted ? '🔇' : '🔊' }}
          </button>
        </section>

        <div v-if="feedback" class="game-feedback" role="status">{{ feedback }}</div>
        <Transition name="phase-cue">
          <div v-if="phaseCue" class="phase-transition" role="status">
            <span>GAME PHASE</span>
            <strong>{{ phaseCue }}</strong>
          </div>
        </Transition>
        <div v-if="phase === 'ended'" class="end-overlay">
          <strong>{{ state.winner === 'cat' ? '猫方获胜' : '鼠方获胜' }}</strong>
          <span>正在生成赛事结算</span>
        </div>
      </div>
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
.game-feedback {
  position: absolute;
  z-index: 5;
  top: 72px;
  left: 50%;
  padding: 9px 14px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(20, 58, 43, 0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 750;
  box-shadow: 0 8px 22px rgba(15, 48, 35, 0.22);
}
.phase-transition {
  position: absolute;
  z-index: 8;
  top: 50%;
  left: 50%;
  display: flex;
  min-width: 220px;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 18px 28px;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(255,255,255,.5);
  border-radius: 18px;
  background: rgba(12, 48, 35, .9);
  color: #fff;
  box-shadow: 0 22px 60px rgba(5,28,19,.28);
  backdrop-filter: blur(12px);
}
.phase-transition span { color: #64e4ad; font-size: 8px; font-weight: 900; letter-spacing: .18em; }
.phase-transition strong { font-size: 22px; }
.phase-cue-enter-active, .phase-cue-leave-active { transition: opacity .22s ease, transform .22s ease; }
.phase-cue-enter-from, .phase-cue-leave-to { opacity: 0; transform: translate(-50%, calc(-50% + 8px)) scale(.96); }
.map-panel.capture-flash::after {
  content: '';
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
  border: 5px solid rgba(255, 202, 65, .72);
  border-radius: inherit;
  animation: capture-flash .68s ease-out both;
}
.sound-toggle {
  margin-top: 10px;
  padding: 6px 9px;
  border: 0;
  border-radius: 8px;
  background: #edf5f0;
  color: #4e6e5f;
  font-size: 9px;
  cursor: pointer;
}
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
@keyframes capture-flash { from { opacity: 1; box-shadow: inset 0 0 70px rgba(255,188,42,.35); } to { opacity: 0; } }

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

/* 2.1 沉浸式赛事布局：地图是主舞台，战况与控制均为可收起浮层。 */
.game-map-page {
  height: 100dvh;
  min-height: 680px;
  padding: 12px clamp(12px, 1.6vw, 24px) 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 0%, rgba(61, 192, 131, 0.2), transparent 30%),
    linear-gradient(160deg, #eaf2ed, #dce8e0);
}
.game-topbar { width: 100%; margin-bottom: 10px; }
.game-stage {
  display: block;
  width: 100%;
  height: calc(100dvh - 82px);
  margin: 0;
}
.map-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  border-color: rgba(18, 63, 46, 0.18);
  border-radius: 22px;
  box-shadow: 0 24px 70px rgba(17, 57, 42, 0.2);
}
.match-hud {
  position: absolute;
  z-index: 4;
  top: 14px;
  right: 66px;
  width: min(250px, calc(100% - 150px));
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.52);
  border-radius: 17px;
  background: rgba(11, 37, 28, 0.84);
  color: #fff;
  box-shadow: 0 16px 38px rgba(7, 29, 21, 0.24);
  backdrop-filter: blur(14px);
  transition: width 0.2s ease;
}
.match-hud.collapsed { width: 214px; }
.hud-toggle {
  width: 100%;
  padding: 7px 11px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  font-size: 9px;
  font-weight: 750;
  text-align: right;
  cursor: pointer;
}
.match-hud .status-grid { grid-template-columns: repeat(4, 1fr); }
.match-hud .status-grid div { gap: 2px; padding: 10px 6px; text-align: center; }
.match-hud .status-grid div:nth-child(n) { border: 0; }
.match-hud .status-grid span { color: rgba(255, 255, 255, 0.58); font-size: 8px; }
.match-hud .status-grid strong { color: #fff; font-size: 17px; }
.match-hud .status-grid small { color: rgba(255, 255, 255, 0.65); }
.hud-details { padding: 0 11px 11px; }
.target-card {
  padding: 10px;
  border: 1px solid rgba(77, 229, 158, 0.18);
  border-radius: 12px;
  background: rgba(54, 163, 112, 0.12);
}
.target-card.near { border-color: rgba(255, 205, 82, 0.4); background: rgba(255, 191, 53, 0.12); }
.target-card.danger { border-color: rgba(255, 103, 79, 0.55); background: rgba(255, 77, 56, 0.16); animation: danger-glow 0.8s ease-in-out infinite alternate; }
.card-kicker { margin-bottom: 4px; color: #62e2a9; font-size: 8px; }
.target-card strong { display: block; font-size: 12px; }
.target-card p, .simulation-note {
  margin: 5px 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 8px;
  line-height: 1.55;
}
.event-feed { margin-top: 8px; padding: 8px 10px; border-radius: 11px; background: rgba(255, 255, 255, 0.06); }
.event-feed p { margin: 4px 0 0; color: rgba(255, 255, 255, 0.82); font-size: 9px; }
.simulation-note { margin: 8px 2px 0; }

.movement-deck {
  position: absolute;
  z-index: 4;
  left: 16px;
  bottom: 18px;
  display: grid;
  grid-template-columns: auto auto;
  align-items: end;
  gap: 5px 8px;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  background: rgba(11, 37, 28, 0.8);
  color: rgba(255, 255, 255, 0.72);
  box-shadow: 0 14px 32px rgba(8, 31, 22, 0.23);
  backdrop-filter: blur(12px);
}
.movement-deck > span { grid-column: 1 / -1; font-size: 8px; font-weight: 800; text-align: center; }
.movement-deck .dpad { gap: 3px; }
.movement-deck .dpad div { gap: 3px; }
.movement-deck .dpad button {
  width: 37px;
  height: 32px;
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 15px;
}
.movement-deck .sound-toggle {
  width: 31px;
  height: 31px;
  margin: 0 0 1px;
  padding: 0;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 13px;
}
.game-feedback { top: 18px; z-index: 6; background: rgba(13, 51, 38, 0.94); }
.end-overlay { z-index: 7; }

@keyframes danger-glow {
  to { box-shadow: 0 0 0 3px rgba(255, 89, 65, 0.13), inset 0 0 20px rgba(255, 89, 65, 0.09); }
}

@media (max-width: 700px) {
  .game-map-page { min-height: 0; padding: 8px 7px 9px; }
  .game-topbar { margin-bottom: 7px; }
  .game-stage { height: calc(100dvh - 62px); }
  .map-panel { min-height: 0; border-radius: 17px; }
  .match-hud {
    top: 54px;
    right: 7px;
    width: calc(100% - 14px);
    max-width: 292px;
    border-radius: 14px;
  }
  .match-hud .hud-toggle, .match-hud .hud-details { display: none; }
  .match-hud.collapsed { width: 204px; }
  .hud-toggle { padding: 5px 9px; }
  .match-hud .status-grid div { padding: 7px 4px; }
  .match-hud .status-grid strong { font-size: 15px; }
  .hud-details { padding: 0 8px 8px; }
  .event-feed, .simulation-note { display: none; }
  .movement-deck { left: 9px; bottom: 28px; padding: 7px; }
  .movement-deck .dpad button { width: 36px; height: 31px; }
  .game-feedback { top: 46px; max-width: 75%; text-align: center; }
}

@media (prefers-reduced-motion: reduce) {
  .match-hud, .target-card, .phase-timer, .map-panel.capture-flash::after { transition: none; animation: none; }
}
</style>
