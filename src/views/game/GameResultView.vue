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
