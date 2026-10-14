<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getState } from '@/game/engine.js'
import { clearGameResult, loadGameResult } from '@/game/result-store.js'

const router = useRouter()
const result = ref(null)
const remainingMice = computed(() =>
  result.value?.players?.filter((player) => player.role === 'mouse').length ?? 0
)
const catCount = computed(() =>
  result.value?.players?.filter((player) => player.role === 'cat').length ?? 0
)
const playerCaptures = computed(() =>
  result.value?.players?.find((player) => player.controller === 'human')?.captures ?? 0
)
const eventSummaries = computed(() => (result.value?.events ?? [])
  .filter((event) => event.type === 'capture-confirmed')
  .map((event) => `${event.catId} 抓获 ${event.mouseId}`)
  .slice(-4))

onMounted(() => {
  result.value = loadGameResult() ?? getState()
})

function playAgain() {
  clearGameResult()
  router.push('/game/play')
}

function backHome() {
  router.push('/')
}
</script>

<template>
  <div class="page game-result">
    <div class="result-card" v-if="result">
      <div class="emoji">{{ result.winner === 'cat' ? '🐱🏆' : '🐭🏆' }}</div>
      <h1 class="title">
        {{ result.winner === 'cat' ? '猫获胜！' : '鼠逃脱成功！' }}
      </h1>
      <p class="reason">
        {{ result.winner === 'cat' ? '所有老鼠都已加入猫阵营' : `时间用尽，仍有 ${remainingMice} 只老鼠存活` }}
      </p>

      <div class="stats">
        <div class="stat-item">
          <span>最终猫阵营</span>
          <strong>{{ catCount }} 只</strong>
        </div>
        <div class="stat-item">
          <span>存活老鼠</span>
          <strong>{{ remainingMice }} 只</strong>
        </div>
        <div class="stat-item">
          <span>玩家抓捕</span>
          <strong>{{ playerCaptures }} 只</strong>
        </div>
        <div class="stat-item">
          <span>追捕剩余</span>
          <strong>{{ result.chasingTimeLeft }} 秒</strong>
        </div>
      </div>

      <div class="event-summary">
        <span>赛事摘要</span>
        <p v-if="eventSummaries.length === 0">本局没有已保存的抓捕事件</p>
        <p v-for="(event, index) in eventSummaries" :key="`${index}-${event}`">{{ event }}</p>
      </div>

      <p class="simulation-disclaimer">本结果来自二维模拟定位与加速演示，不代表真实 GPS 轨迹。</p>
    </div>

    <div class="actions">
      <button class="btn-primary" @click="playAgain">再来一局</button>
      <button class="btn-secondary" @click="backHome">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.game-result {
  text-align: center;
}
.result-card {
  background: var(--color-white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 40px 24px;
  margin-bottom: 20px;
}
.emoji {
  font-size: 64px;
  margin-bottom: 12px;
}
.title {
  font-size: 24px;
  color: var(--color-primary);
  margin-bottom: 8px;
}
.reason {
  font-size: 14px;
  color: var(--color-text-light);
  margin-bottom: 28px;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 22px 30px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-item span {
  font-size: 13px;
  color: var(--color-text-light);
}
.stat-item strong {
  font-size: 22px;
  color: var(--color-primary);
}
.event-summary {
  width: min(480px, 100%);
  margin: 26px auto 0;
  padding: 16px 18px;
  border: 1px solid rgba(46, 107, 255, 0.12);
  border-radius: 14px;
  background: #f6f9ff;
  text-align: left;
}
.event-summary > span {
  display: block;
  margin-bottom: 7px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.event-summary p { margin: 4px 0; color: var(--color-text-light); font-size: 12px; }
.simulation-disclaimer { margin: 16px 0 0; color: var(--color-text-light); font-size: 11px; }
.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.btn-primary,
.btn-secondary {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
}
.btn-secondary {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
</style>
